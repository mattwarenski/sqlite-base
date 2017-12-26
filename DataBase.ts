import { RowEntity } from "./RowEntity"
import { DBFilter } from "./DBFilter"
import * as SQL from "sql.js"
import { DataType } from "./decorators";
import * as moment from 'moment';
import { ColumnInfo } from "./ColumnInfo";

export class DataBase{
  private filepath: string;
  private tables: RowEntity[];
  private db: any;
  private fs;
  
  constructor(fs: any, filepath: string, tables: RowEntity[]){
    this.filepath = filepath;
    this.tables = tables;
    this.fs = fs;
  }

  dbInitialized(): boolean{
    return this.db != undefined; 
  }

  initDBSync(){
    if(this.fs.existsSync(this.filepath)){
        this.readDBSync();
    }
    else{
      this.db = new SQL.Database();
      this.tables.forEach( t => this.createTable(t));
      this.writeDBSync();
    }
  }
  initDB(cb: ()=>void){
    this.fs.exists(this.filepath, (exists: boolean) => {
      if(exists){
        this.readDB(cb);
      }
      else{
        this.db = new SQL.Database();
        this.tables.forEach( t => this.createTable(t));
        this.writeDBSync();
        cb();
      }
    });
  }

  private updateSchema(): void{
    let currentTables = this.getTables();
    this.tables.forEach( (table: RowEntity) => {
      if(currentTables.indexOf(table.getTableName()) < 0){
        this.createTable(table);
      }
      let cols = table.getColumns().map( (ci: ColumnInfo) => ci.getName());
      let currentColumns = this.getColumns(table).map( col => col[1]);
      cols.forEach((column: string)=>{
        if(currentColumns.indexOf(column) < 0){
          this.run(`ALTER TABLE ${table.getTableName()} ADD ${table.getColumns().find( col => col.getName() === column).toSqlArg()}`)
          console.log('added columns', this.getColumns(table))
          //console.warn(`Found column ${column} that is not in table ${table.getTableName()}. Adding new columns has not been implemented yet`)
        }
      })
    });

  }

  private readDBSync(){
    try{
      let data = this.fs.readFileSync(this.filepath);
      this.db = new SQL.Database(data);
      this.updateSchema();
    }
    catch(e){
        throw Error(`Unable to read DB from ${this.filepath}.\nMessage:${e}}`) 
    }
  }

  private readDB(cb: ()=>void){
    this.fs.readFile(this.filepath, (err, data) => {
      if(err){
        throw Error(`Unable to read DB from ${this.filepath}.\nMessage:${err}}`) 
      }
      this.db = new SQL.Database(data);
      this.updateSchema();
      cb();
    })
  }

  private writeDBSync(){
    try{
      let dataBuffer = this.db.export();
      this.fs.writeFileSync(this.filepath, dataBuffer);
      console.log("saved to ", this.filepath);
    }
    catch(e){
      console.error("Unable to close db", e);
    }
  }

  getTables(): string[]{
    let tables = this.db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    if(tables && tables.length && tables[0].values.length){
      return tables[0].values[0]; 
    }
    return [];
  }

  getColumns(table: RowEntity): string[]{
    let columns = this.db.exec(`PRAGMA table_info(${table.getTableName()});`);
    if(columns && columns.length){
      return columns[0].values; 
    }
    return [];
  }

  upsert(table: RowEntity){
    let vals = [];
    let cols = []
    table.getColumns().forEach( (c, i) => {
      if(table.getValues()[i] !== undefined){
        vals.push(table.getValues()[i]);
        cols.push(c.getName());
      } 
    }); 
    let statement = `REPLACE INTO ${table.getTableName()} (${cols.join(",")}) VALUES (${cols.map( c=>"?")});`;
    this.run(statement, vals);
  }

  private run(statement: string, vals?){
    try{
      this.db.run(statement, vals); 
      this.writeDBSync();
    }
    catch(e){
      throw new Error(`Unable to run query: ${statement}.\nValues: ${vals.join(",")}.\n Original Message: ${e.message}`); 
    }
  
  }

  deleteRow(entity: RowEntity){
    let cols = entity
      .getColumns()
      .filter( c=> entity[c.getName()])
      .map( c => c.getName());
    if(!cols.length){
      console.error("won't delete empty row (no where clause)", entity); 
    }

    let vals = cols.map( c => entity.getValue(c))
    let statment = `DELETE FROM ${entity.getTableName()} WHERE ${cols.map(c=>c+"=?").join(" AND ")}`;
    this.run(statment, vals);
  }

  getAllRows(table){
    let model = new table();
    let statment = this.db.prepare(`SELECT * FROM ${model.getName()};`)
    return this.mapResultsToTable(statment, table);
  }

  private mapResultsToTable<T extends RowEntity>(statement, instance: T){
    let res = [];
    while(statement.step()){
      let row = instance.createNew();
      let columnInfo = instance.getColumns();
      let data = statement.get();
      columnInfo.forEach( (col, index) => {
        if(col.getType() === DataType.DATE){
          let date = moment(data[index]);
          row[col.getName()] = date.toDate();
        }
        else{
          row[col.getName()] = data[index];
        }
      });
      res.push(row);
    }
    return res;
  }

  count(modelObject, filter?: DBFilter): number{
    let where = this.createWhereClause(modelObject, filter);
    let statementSql = `SELECT count(1) FROM ${modelObject.getTableName()} ${where}`;
    let statement = this.db.prepare(statementSql);
    return this.getFirstResult(statement);
  }

  sum(modelObject, sumColumn, filter?: DBFilter): number{
    let where = this.createWhereClause(modelObject, filter);
    let statementSql = `SELECT sum(${sumColumn}) FROM ${modelObject.getTableName()} ${where}`;
    let statement = this.db.prepare(statementSql);
    return this.getFirstResult(statement); 
  }

  private getFirstResult(statement): number{
    statement.step();
    let res = statement.get();
    if(!res || res.length !== 1){
      throw new Error("Expected 1 result from sum/count. Got " + res.length); 
    }
    if(!res[0]){
      return 0;
    }

    return res[0];
  }

  private createWhereClause(modelObject: RowEntity, filter?: DBFilter): string{
    let filters = [];
    modelObject.getColumns().forEach( ci => modelObject[ci.getName()] ? filters.push(ci.getName()) : null);
    let clause = filters.map( prop => `${prop} = ${modelObject[prop]}`).concat( filter ? filter.getDateConstraints() : []).join(" AND ");
    let where = clause ? "WHERE " + clause : "";
    where += filter ? " " + filter.getSortByClause() : "";
    return where; 
  }

  getRows(modelObject: RowEntity, filter?: DBFilter){
    let where = this.createWhereClause(modelObject, filter);
    let statementSql = `SELECT * FROM ${modelObject.getTableName()} ${where}`;
    let statement = this.db.prepare(statementSql);
    return this.mapResultsToTable(statement, modelObject);
  }

  private createTable(table: RowEntity){
    //this won't update if there are new tables. It will only not create if the table itself exists
    let query = `CREATE TABLE IF NOT EXISTS ${table.getTableName()}(${table.getColumns().map(c => c.toSqlArg()).join(",")});`;
    this.db.run(query);
  }
}

import { ColumnInfo } from "./ColumnInfo"
import * as moment from 'moment';
import { Column, DataType, Constraint } from "./decorators";

export abstract class RowEntity{
  private columns: ColumnInfo[];
  private __name: string;
  abstract id: number;

  constructor(name: string){
    this.__name = name;
    this.init();
  }

  private init(){
    if(!this.columns){
      this.columns = []; 
    }
  }

  /**
   * Copy constructor. All class properties that need to transfer must manually be called out here"
   */
  createNew(){
    let copy = Object.create(this.constructor.prototype);
    copy["__name"] = this.__name;
    copy["columns"] = this.columns;
    return copy;
  }

  addColumn(column: ColumnInfo){
    this.init();
    this.columns.push(column);
  }

  getColumns(): ColumnInfo[]{
    return this.columns; 
  }

  getValues(): any[]{
    return this.columns.map( c => this.getValue(c.getName()));
  }

  getValue(key: string){
    return this.formatObject(this[key]) 
  }

  private formatObject(prop: any){
    if(prop instanceof Date){
      return moment(prop).format("YYYY-MM-DD")
    } 
    return prop;
  }

  getTableName(): string{
    return this.__name;
  }
}

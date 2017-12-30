import {DataBase} from '../DataBase';
import {RowEntity} from '../RowEntity';
import { Column, DataType, Constraint } from "../decorators";
import * as fs from 'fs';

const filepath = "spec/testDB.sql";


function deleteDB(){
  if(fs.existsSync(filepath)){
    fs.unlinkSync(filepath);
  }
}

class TestTable extends RowEntity{

  constructor(){
    super("TestTable"); 
  }

  @Column(DataType.INTEGER, Constraint.PRIMARY_KEY)
  id: number;

  @Column(DataType.TEXT)
  str: string;

  @Column(DataType.DATETIME)
  date: Date;

  @Column(DataType.INT)
  num: number;

}

describe("Sql functions", ()=>{
  describe("Initialization async", ()=>{

    let db: DataBase;


    beforeAll(()=>{
      deleteDB();
    });

    beforeEach(()=>{
      let tables = [new TestTable()]
      db = new DataBase(fs, filepath, tables); 
    })

    it('should create db if it does not exist', (done)=>{
      expect(fs.existsSync(filepath)).toBe(false);
      expect(db.dbInitialized()).toBe(false);
      db.initDB(()=>{
        expect(db.dbInitialized()).toBe(true);
        expect(db.getTables().length).toBe(1);
        expect(fs.existsSync(filepath)).toBe(true);  
        done();
      })
    });

    it('should load db if it does exist', (done)=>{
      expect(fs.existsSync(filepath)).toBe(true);
      expect(db.dbInitialized()).toBe(false);
      db.initDB(()=>{
        expect(db.dbInitialized()).toBe(true);
        expect(db.getTables().length).toBe(1);
        expect(fs.existsSync(filepath)).toBe(true);  
        done();
      })
    });
  });

  describe("Initialization sync", ()=>{
    let db: DataBase;


    beforeAll(()=>{
      deleteDB();
    });

    beforeEach(()=>{
      let tables = [new TestTable()]
      db = new DataBase(fs, filepath, tables); 
    })

    it('should create db if it does not exist', ()=>{
      expect(fs.existsSync(filepath)).toBe(false);
      expect(db.dbInitialized()).toBe(false);
      db.initDBSync();
      expect(db.dbInitialized()).toBe(true);
      expect(db.getTables().length).toBe(1);
      expect(fs.existsSync(filepath)).toBe(true);  
    });

    it('should load db if it does exist', ()=>{
      expect(fs.existsSync(filepath)).toBe(true);
      expect(db.dbInitialized()).toBe(false);
      db.initDBSync();
      expect(db.dbInitialized()).toBe(true);
      expect(db.getTables().length).toBe(1);
      expect(fs.existsSync(filepath)).toBe(true);  
    });
  });

  describe("db manipulations", ()=>{
    let db: DataBase;


    beforeEach((done)=>{
      deleteDB();
      let tables = [new TestTable()];
      db = new DataBase(fs, filepath, tables); 
      db.initDB(done);
    })

    it('should insert null rows', ()=>{
      db.upsert(new TestTable()); 
      db.upsert(new TestTable()); 

      const rows = db.getRows(new TestTable())
      expect(rows.length).toBe(2);
      expect(rows[0].id).not.toEqual(rows[1].id);
    });

    it('should insert rows', ()=>{
      let entity = new TestTable();
      entity.num = 7;
      entity.str = "string";
      let testDate = new Date();
      entity.date = testDate;
      db.upsert(entity); 

      let allRows =  db.getRows(new TestTable());
      expect(allRows.length).toBe(1);
      expect(allRows[0].str).toEqual("string");
      expect(allRows[0].num).toEqual(7);
      //TODO recheck when times are supported
      //expect(allRows[0].date.toString()).toEqual(testDate.toString());
    });

    it('should filter on 0', ()=>{
      let entity = new TestTable();
      entity.num = 0;

      let entity2 = new TestTable();
      entity2.num = 1;

      let entity3 = new TestTable();
      db.upsert(entity); 
      db.upsert(entity2); 
      db.upsert(entity3); 

      let res = db.getRows(entity);
      expect(res.length).toBe(1);
      expect(res[0].num).toEqual(0);
    
    })

    it('should filter with custom where', ()=>{
      let entity1 = new TestTable();
      entity1.str = "str1";
      let entity2 = new TestTable();
      entity2.str = "str2";
      let entity3 = new TestTable();
      entity3.str = "str3";
      db.upsert(entity1); 
      db.upsert(entity2); 
      db.upsert(entity3); 

      expect(db.getWithWhere(new TestTable(), "where str = 'str1'").length).toEqual(1);
      expect(db.getWithWhere(new TestTable(), "WHERE str = 'str1'").length).toEqual(1);
      expect(db.getWithWhere(new TestTable(), "str = 'str1'").length).toEqual(1);
    })

    it('should count', ()=>{
      let entity1 = new TestTable();
      entity1.str = "str1";
      let entity2 = new TestTable();
      entity2.str = "str2";
      let entity3 = new TestTable();
      entity3.str = "str3";
      db.upsert(entity1); 
      db.upsert(entity2); 
      db.upsert(entity3); 

      expect(db.count(new TestTable())).toEqual(3);
    })

    it('should sum', ()=>{
      let entity1 = new TestTable();
      entity1.num = 10;
      let entity2 = new TestTable();
      entity2.num = 20;
      let entity3 = new TestTable();
      entity3.num = 30;
      db.upsert(entity1); 
      db.upsert(entity2); 
      db.upsert(entity3); 

      expect(db.sum(new TestTable(), "num")).toEqual(10 + 20 + 30);
    });

    it('should sum with custom where cluase', ()=>{
      let entity1 = new TestTable();
      entity1.num = 10;
      entity1.str = "thing1";
      let entity2 = new TestTable();
      entity2.str = "thing1";
      entity2.num = 20;
      let entity3 = new TestTable();
      entity3.num = 30;
      entity3.str = "thing2";

      db.upsert(entity1); 
      db.upsert(entity2); 
      db.upsert(entity3); 

      const filter = new TestTable();
      filter.str = "thing1";
      expect(db.sumWithWhere(filter, "num", "WHERE num > 19")).toEqual(20 + 30);
      expect(db.sumWithWhere(filter, "num", "where num > 19")).toEqual(20 + 30);
      expect(db.sumWithWhere(filter, "num", "num > 19")).toEqual(20 + 30);
    });

    it('should sum with filter', ()=>{
      let entity1 = new TestTable();
      entity1.num = 10;
      entity1.str = "thing1";
      let entity2 = new TestTable();
      entity2.str = "thing1";
      entity2.num = 20;
      let entity3 = new TestTable();
      entity3.num = 30;
      entity3.str = "thing2";

      db.upsert(entity1); 
      db.upsert(entity2); 
      db.upsert(entity3); 

      const filter = new TestTable();
      filter.str = "thing1";
      expect(db.sum(filter, "num")).toEqual(10 + 20);
    })

    it('should return 0 if none found', ()=>{
      let entity1 = new TestTable();
      entity1.num = 10;
      let entity2 = new TestTable();
      entity2.num = 20;
      let entity3 = new TestTable();
      entity3.num = 30;
      db.upsert(entity1); 
      db.upsert(entity2); 
      db.upsert(entity3); 

      expect(db.sum(new TestTable(), "str")).toEqual(0);

    });
  });
});


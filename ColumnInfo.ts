import {DataType, Constraint} from  "./decorators"

export class ColumnInfo{
  private name: string;
  private dataType: DataType;
  private constraints: Constraint[];
  constructor(name: string, dataType: DataType, constraints?: Constraint[]){
    this.name = name;
    this.dataType = dataType;
    this.constraints = constraints;
  }

  getName(): string{
    return this.name;
  }

  getType(): DataType{
    return this.dataType; 
  }

  toSqlArg(): string{
    return `${this.name} ${DataType[this.dataType]} ${this.constraints.map( c => Constraint[c].replace("_", " ")).join(" ")}`;
  }
}

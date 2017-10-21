export class DBFilter{
  earliestDate: Date;
  latestDate: Date;
  sortBy: string;
  sortDesc: boolean;
  dateField: string;

  /**
   *https://stackoverflow.com/questions/5129624/convert-js-date-time-to-mysql-datetime
   */
  private formatObject(prop: any){
    if(prop instanceof Date){
      return `'${prop.toISOString().slice(0, 19).replace('T', ' ')}'`;
    } 
    return prop;
  }

  getDateConstraints(): string[]{
    return [ this.dateField && this.earliestDate ? `${this.dateField} >= ${this.formatObject(this.earliestDate)}` : "",
      this.dateField && this.latestDate ? `${this.dateField} <= ${this.formatObject(this.latestDate)}` : ""]
      .filter( s => s);
  }

  getSortByClause(): string{
      return this.sortBy ? `ORDER BY ${this.sortBy} ${this.sortDesc ? "DESC" : ""}` : "";
  }
}

import { RowEntity } from "./RowEntity"
import { DataBase } from "./DataBase"

declare global {
  interface Window {
    require: any;
  }
}

let fs = window.require('fs');
export function createElectronDB(filepath: string, tables: RowEntity[]){
  return new DataBase(fs, filepath, tables);
}

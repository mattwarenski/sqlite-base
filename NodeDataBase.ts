import * as fs from 'fs';
import { RowEntity } from "./RowEntity"
import { DataBase } from "./DataBase"

export function createNodeDB(filepath: string, tables: RowEntity[]){
  return new DataBase(fs, filepath, tables);
}

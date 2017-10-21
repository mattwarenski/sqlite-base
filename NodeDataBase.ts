import * as fs from 'fs';
import { RowEntity } from "./RowEntity"
import { DataBase } from "./DataBase"

export function createNodeDB(filepath: string, tables: RowEntity[]): DataBase{
  return new DataBase(fs, filepath, tables);
}

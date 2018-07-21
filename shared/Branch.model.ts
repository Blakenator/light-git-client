import {Reference} from "nodegit";

export class BranchModel {
  public name: string;
  public reference: Reference;
  public ahead: number;
  public behind: number;
}

export class ErrorModel {
  public source: string;
  public occurredWhile: string;
  public content: ErrorModel | string;

  constructor(source: string, occurredWhile: string, content: any) {
    this.source = source;
    this.occurredWhile = occurredWhile;
    this.content = ErrorModel.isErrorModel(content) || typeof content == 'string' ? content : JSON.stringify(content);
  }

  static isErrorModel(error: any) {
    return error &&
      error.source != undefined &&
      typeof error.source == 'string' &&
      error.occurredWhile != undefined &&
      typeof error.occurredWhile == 'string' &&
      error.content != undefined;
  }

  static getRootError(error: ErrorModel) {
    return error && (typeof error.content == 'string' || !ErrorModel.isErrorModel(error.content)) ?
      error :
      this.getRootError(<ErrorModel>error.content);
  }

  static getRootErrorMessage(error: any) {
    return error && ErrorModel.isErrorModel(error) ? ErrorModel.getRootError(error).content : JSON.stringify(error);
  }
}

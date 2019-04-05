export class ErrorModel {
  public source: string;
  public occurredWhile: string;
  public content: ErrorModel | string;

  constructor(source: string, occurredWhile: string, content: any) {
    this.source = source;
    this.occurredWhile = occurredWhile;
    try {
      this.content = ErrorModel.isErrorModel(content) || typeof content == 'string' ?
                     content :
                     typeof content.errorOutput == 'string' ? content.errorOutput : JSON.stringify(content);
    } catch (e) {
      console.error(e);
    }
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
    if (!error) {
      return undefined;
    } else {
      return !ErrorModel.isErrorModel(error.content) && typeof error.content == 'string' ?
             error :
             ErrorModel.getRootError(<ErrorModel>error.content);
    }
  }

  static reduceErrorContent(error: ErrorModel) {
    try {
      let internal = JSON.parse(error.content.toString());
      if (internal.message || internal.content) {
        return internal.message || internal.content;
      } else {
        return error.content;
      }
    } catch (e) {
      return error.content;
    }
  }

  static getRootErrorMessage(error: any) {
    return error && ErrorModel.isErrorModel(error) ? ErrorModel.getRootError(error).content :
           (error.message ? error.message : JSON.stringify(error));
  }
}

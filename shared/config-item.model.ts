export class ConfigItemModel {
  public key: string;
  public value: string;
  public sourceFile: string;

  constructor(key: string = '', value: string = '', sourceFile: string = '') {
    this.key = key;
    this.value = value;
    this.sourceFile = sourceFile;
  }
}

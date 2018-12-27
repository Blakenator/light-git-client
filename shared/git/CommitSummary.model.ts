export class CommitSummaryModel {
  public hash: string;
  public authorName: string;
  public authorEmail: string;
  public authorDate: Date;
  public message: string;
  public currentTags: string[];
  public graphBlockTargets: { target: number, source: number, isCommit: boolean, branchIndex: number,isMerge:boolean}[];

  static getCommitBranchColor(index: number) {
    let rgb = CommitSummaryModel.HSVtoRGB((index * .27) % 1, .8, .8);
    let r = (rgb.r.toString(16).length == 1 ? '0' : '') + rgb.r.toString(16);
    let g = (rgb.g.toString(16).length == 1 ? '0' : '') + rgb.g.toString(16);
    let b = (rgb.b.toString(16).length == 1 ? '0' : '') + rgb.b.toString(16);
    return '#' + r + g + b;
  }

  static HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
      s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:
        r = v, g = t, b = p;
        break;
      case 1:
        r = q, g = v, b = p;
        break;
      case 2:
        r = p, g = v, b = t;
        break;
      case 3:
        r = p, g = q, b = v;
        break;
      case 4:
        r = t, g = p, b = v;
        break;
      case 5:
        r = v, g = p, b = q;
        break;
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }
}

export class CommitGraphNode {
  public children: CommitGraphNode[] = [];
  public hash = '';
  public parents: CommitGraphNode[] = [];
}

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { BranchModel } from '../../../../../shared/git/Branch.model';

@Component({
    selector: 'app-merge-branch-dropdown',
    templateUrl: './merge-branch-dropdown.component.html',
    styleUrls: ['./merge-branch-dropdown.component.css'],
    standalone: false
})
export class MergeBranchDropdownComponent implements OnInit {
  @Input() locals: BranchModel[];
  @Input() remotes: BranchModel[];
  @Input() selection: BranchModel;
  @Output() selectionChange = new EventEmitter<BranchModel>();

  constructor() {}

  ngOnInit() {}
}

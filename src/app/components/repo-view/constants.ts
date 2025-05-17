import { ActiveOperation } from '../../../../shared/git/Commit.model';

export const ActiveOperationToPropMap: Record<
  ActiveOperation,
  { class: string; name: string; icon: string; fa: boolean }
> = {
  [ActiveOperation.Merge]: {
    class: 'success',
    name: 'Merge',
    icon: 'merge_type',
    fa: false,
  },
  [ActiveOperation.Rebase]: {
    class: 'warning',
    name: 'Rebase',
    icon: 'tasks',
    fa: true,
  },
  [ActiveOperation.CherryPick]: {
    class: 'info',
    name: 'Cherry Pick',
    icon: 'band-aid',
    fa: true,
  },
  [ActiveOperation.Revert]: {
    class: 'danger',
    name: 'Revert',
    icon: 'undo',
    fa: true,
  },
};

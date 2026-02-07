import { createContext, useContext } from 'react';

interface EditSectionsContextValue {
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
}

export const EditSectionsContext = createContext<EditSectionsContextValue>({
  isEditing: false,
  setIsEditing: () => {},
});

export const useEditSections = () => useContext(EditSectionsContext);

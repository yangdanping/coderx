export interface TabsContext {
  activeValue: { value: string | number };
  handleTabClick: (name: string | number) => void;
  direction: { value: string };
}

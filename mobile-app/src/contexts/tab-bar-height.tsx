import { createContext, use } from 'react';

const TabBarHeightContext = createContext(0);

export const TabBarHeightProvider = TabBarHeightContext.Provider;

export function useTabBarHeight() {
  return use(TabBarHeightContext);
}

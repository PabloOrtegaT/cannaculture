import { useEffect, useState } from "react";

// Centralized hydration pattern: start with a server-safe initial value,
// then sync to the hydrated value after mount. Callers that need browser
// APIs should pass a function so evaluation is deferred to the effect.
export function useHydratedValue<T>(
  initialValue: T,
  hydratedValue: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- this hook encapsulates the intentional post-hydration state sync
    setValue(
      typeof hydratedValue === "function" ? (hydratedValue as () => T)() : hydratedValue,
    );
  }, [hydratedValue]);
  return [value, setValue];
}

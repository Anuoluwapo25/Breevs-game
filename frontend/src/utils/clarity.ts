import { ClarityValue, cvToJSON } from "@stacks/transactions";

/**
 * Fully normalizes Clarity values returned from read-only calls.
 * Handles nested tuples, optionals, lists, uints, bools, and principals.
 */
export function clarityToJSON(cv: ClarityValue): any {
  const json = cvToJSON(cv);

  function normalize(value: any): any {
    // Primitive case
    if (value === null || value === undefined) return value;

    // Handle wrapped { type, value } objects
    if (typeof value === "object" && "type" in value && "value" in value) {
      switch (value.type) {
        case "uint":
          return BigInt(value.value);
        case "int":
          return BigInt(value.value);
        case "bool":
          return value.value === true;
        case "principal":
          return value.value;
        case "(optional none)":
          return null;
        case "optional":
          return value.value ? normalize(value.value) : null;
        case "(list":
        case "list":
          return Array.isArray(value.value)
            ? value.value.map((v: any) => normalize(v))
            : [];
        case "tuple":
          return normalize(value.value);
        default:
          return normalize(value.value);
      }
    }

    // Handle tuples / nested objects
    if (typeof value === "object" && !Array.isArray(value)) {
      const out: any = {};
      for (const key in value) {
        out[key] = normalize(value[key]);
      }
      return out;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((v) => normalize(v));
    }

    return value;
  }

  return normalize(json.value ?? json);
}

export function principalToString(principalCV: any): string {
  if (!principalCV?.value) return "";
  const addr = principalCV.value.address?.hash160;
  const version = principalCV.value.address?.version;
  const contractName = principalCV.value.contractName?.content;
  if (contractName) {
    return `${version}${addr}.${contractName}`;
  }

  return `${version}${addr}`;
}

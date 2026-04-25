// Utilities for generating GBNF (GGML BNF) grammar strings.
export const Grammar = {
  /**
   * Forces the model to output a valid JSON object.
   */
  json: (): string => {
    return `
      root   ::= object
      value  ::= object | array | string | number | ("true" | "false" | "null")
      object ::= "{" space ( pair ( "," space pair )* )? "}" space
      pair   ::= string ":" space value
      array  ::= "[" space ( value ( "," space value )* )? "]" space
      string ::= '"' ( [^"\\\\] | "\\\\" ( ["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] ) )* '"' space
      number ::= ("-"? ([0-9] | [1-9] [0-9]*)) ("." [0-9]+)? ([eE] [+-]? [0-9]+)? space
      space  ::= " "*
    `.trim();
  },

  /**
   * Constrains the output to a specific list of strings.
   * Useful for classification or multiple-choice.
   */
  choice: (options: string[]): string => {
    const formatted = options.map((opt) => `"${opt.replace(/"/g, '\\"')}"`)
      .join(" | ");
    return `root ::= ${formatted}`;
  },

  /**
   * Forces the output to be an integer.
   */
  integer: (): string => {
    return `root ::= [0-9]+`;
  },

  /**
   * Forces the output to be a list (array) of specific items.
   */
  list: (itemRule = "string"): string => {
    return `
      root   ::= "[" space ( ${itemRule} ( "," space ${itemRule} )* )? "]"
      string ::= '"' [^"]* '"'
      space  ::= " "*
    `.trim();
  },

  /**
   * Forces a flat JSON object with specific required keys.
   * @example Grammar.schema({ name: "string", age: "number" })
   */
  schema: (fields: Record<string, "string" | "number" | "boolean">): string => {
    const rules = Object.entries(fields).map(([key, type]) => {
      const typeRule = type === "string"
        ? "string"
        : type === "number"
        ? "number"
        : '("true" | "false")';
      return `"\\"${key}\\"" ":" space ${typeRule}`;
    }).join(' "," space ');

    return `
      root   ::= "{" space ${rules} "}" space
      string ::= '"' [^"]* '"'
      number ::= [0-9]+
      space  ::= " "*
    `.trim();
  },
};

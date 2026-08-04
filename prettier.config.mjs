/** @type {import("prettier").Config} */
const config = {
  semi: false,
  singleQuote: false,
  tabWidth: 2,
  printWidth: 80,
  trailingComma: "all",

  plugins: ["prettier-plugin-tailwindcss"],
}

export default config

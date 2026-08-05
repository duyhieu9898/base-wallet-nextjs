import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

/**
 * Public boundary của Web3 foundation.
 *
 * Application và feature import runtime API từ `@/web3/evm`. Ngoài ra chỉ có
 * hai leaf path công khai, đều React-free và wagmi-free, để pure domain code
 * dùng được mà không kéo cả EVM runtime vào module graph:
 *
 * - `@/web3/evm/address`
 * - `@/web3/evm/errors`
 *
 * Xem `src/web3/evm/index.ts` và `docs/foundation/EXTENSION_CONTRACT.md`.
 */
const WEB3_PUBLIC_PATHS = [
  "@/web3/evm",
  "@/web3/evm/address",
  "@/web3/evm/errors",
]

const web3DeepImportPatterns = [
  {
    group: [
      "@/web3/evm/*",
      "@/web3/evm/**",
      "@/web3/core",
      "@/web3/core/*",
      "@/web3/core/**",
      ...WEB3_PUBLIC_PATHS.map((path) => `!${path}`),
    ],
    message:
      "EVM internals là private. Import từ @/web3/evm (runtime API), hoặc @/web3/evm/address | @/web3/evm/errors (pure leaf). Xem src/web3/evm/index.ts.",
  },
]

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Dependency direction: foundation không được biết tới application.
  {
    files: ["src/web3/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/features",
                "@/features/*",
                "@/features/**",
                "@/app",
                "@/app/*",
                "@/app/**",
                "@/contracts",
                "@/contracts/*",
                "@/contracts/**",
              ],
              message:
                "Web3 foundation không được import application feature, route hoặc contract registry. Foundation phải dùng được ở dApp khác.",
            },
          ],
        },
      ],
    },
  },

  // Application và feature chỉ dùng public boundary.
  {
    files: [
      "src/features/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/app/**/*.{ts,tsx}",
      "src/providers/**/*.{ts,tsx}",
      "src/contracts/**/*.{ts,tsx}",
      "src/lib/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/mocks/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: web3DeepImportPatterns }],
    },
  },

  // UI layer không được tự submit transaction.
  //
  // Feature hook ĐƯỢC phép gọi write hook của Wagmi cho contract của chính nó
  // (decision 0015) — với điều kiện đi qua `useEvmWriteLifecycle`. Ràng buộc đó
  // được bảo vệ bằng test và review policy, không phải bằng lint.
  {
    files: [
      "src/features/**/components/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/app/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: web3DeepImportPatterns,
          paths: [
            {
              name: "wagmi",
              importNames: ["useWriteContract", "useSendTransaction"],
              message:
                "UI layer không submit transaction trực tiếp. Dùng public write hook của @/web3/evm, hoặc một feature hook đi qua useEvmWriteLifecycle.",
            },
          ],
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated assets: MSW worker (mockServiceWorker.js) và SVG tĩnh.
    "public/**",
  ]),
])

export default eslintConfig

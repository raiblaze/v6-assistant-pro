# Frontend Tech Stack: V6 Assistant Pro

This document outlines the modern, high-performance tech stack used in the V6 Assistant Pro frontend. It is designed for rich interactions, glassmorphic aesthetics, and efficient AI response rendering.

## 核心架构 (Core Architecture)

| Technology | Purpose | Version |
| :--- | :--- | :--- |
| **React** | Component-based UI library | ^18.2.0 |
| **Vite** | Next-generation build tool & dev server | ^5.0.0 |
| **TypeScript** | Static typing for JavaScript | ^5.2.0 |
| **Tailwind CSS** | Utility-first styling (v4) | ^4.1.18 |

## UI & 交互 (UI & Interaction)

- **Framer Motion (`^11.18.2`):** Used for smooth transitions, presence animations, and layout changes.
- **Lucide React (`^0.300.0`):** Comprehensive icon set for consistent UI symbols.
- **Glassmorphism:** Custom implementation using Tailwind v4's backdrop blur and transparent borders (defined in `index.css`).

## AI 内容渲染 (AI Content Rendering)

- **react-markdown (`^9.1.0`):** Renders streaming LLM responses into semantic HTML.
- **remark-gfm (`^4.0.1`):** Support for GitHub Flavored Markdown (tables, checklists, etc.).
- **react-syntax-highlighter (`^15.5.0`):** High-quality code block formatting with theme support.

## 状态与数据 (State & Data)

- **Axios (`^1.13.5`):** Promise-based HTTP client for API communication.
- **Tailwind Merge (`^2.6.1`) & CLSX (`^2.1.1`):** Standard utilities for dynamic and conditional CSS class management.

## 关键配置 (Key Configurations)

### Tailwind CSS v4 (Integrated with Vite)
The project uses the new `@tailwindcss/vite` plugin. Custom themes are defined directly in the CSS using the `@theme` block:

```css
@theme {
    --font-sans: 'Inter', system-ui, ...;
    --color-brand-primary: #3b82f6;
    /* ... custom palette ... */
}
```

### Vite Configuration
Minimalistic setup using the React and Tailwind plugins:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
})
```

## 目录结构 (Directory Structure)

```text
frontend/
├── src/
│   ├── App.tsx          # Main application logic & layout
│   ├── main.tsx         # Entry point
│   └── index.css        # Tailwind v4 configuration & global styles
├── index.html           # HTML template
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite build configuration
```

```markdown
# certd Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches the core development patterns and workflows for the `certd` TypeScript codebase. It covers coding conventions, file organization, commit patterns, and detailed step-by-step instructions for extending user preferences—a common feature workflow. The repository is structured for modularity, with clear separation between UI and backend logic, and emphasizes maintainable, convention-driven development.

## Coding Conventions

### File Naming

- **CamelCase** is used for file names.
  - Example: `userPreferences.ts`, `preferencesDrawer.vue`

### Import Style

- **Absolute imports** are preferred.
  - Example:
    ```typescript
    import { getUserPreferences } from 'packages/ui/certd-client/src/vben/layouts/widgets/preferences/api';
    ```

### Export Style

- **Named exports** are used throughout the codebase.
  - Example:
    ```typescript
    export function getUserPreferences() { ... }
    export const PREFERENCE_KEYS = [ ... ];
    ```

### Commit Patterns

- **Conventional commits** are used, with the `feat` prefix for new features.
  - Example:
    ```
    feat: add account sync to preferences
    ```

## Workflows

### Extend Preferences Feature

**Trigger:** When someone wants to add or enhance a user preference feature (e.g., import/export, sync to account).  
**Command:** `/extend-preferences`

Follow these steps to extend user preferences functionality:

1. **Update localization files**  
   Add or modify strings in:
   - `packages/ui/certd-client/src/locales/langs/en-US/preferences.ts`
   - `packages/ui/certd-client/src/locales/langs/zh-CN/preferences.ts`
   ```typescript
   // en-US/preferences.ts
   export default {
     sync: "Sync Preferences",
     import: "Import Preferences",
     // ...
   };
   ```

2. **Modify or add Vue components for preferences UI**  
   Update or create components such as:
   - `preferences-drawer.vue`
   - `account-sync.ts`
   ```vue
   <!-- preferences-drawer.vue -->
   <template>
     <div>
       <button @click="syncPreferences">{{ $t('preferences.sync') }}</button>
     </div>
   </template>
   ```

3. **Update or add supporting icon definitions**  
   Edit:
   - `packages/ui/certd-client/src/vben/icons/lucide.ts`
   ```typescript
   export const SyncIcon = { /* icon definition */ };
   ```

4. **Implement or update store logic for settings**  
   Update:
   - `packages/ui/certd-client/src/store/settings/index.tsx`
   ```typescript
   export function syncPreferencesToAccount() { ... }
   ```

5. **Add or update backend API/controller for user preferences**  
   Edit or add:
   - `packages/ui/certd-client/src/vben/layouts/widgets/preferences/api.ts`
   - `packages/ui/certd-server/src/controller/user/mine/user-preferences.ts`
   ```typescript
   // user-preferences.ts
   export async function updateUserPreferences(req, res) { ... }
   ```

6. **Write or update backend tests for new preference logic**  
   Add or update:
   - `packages/ui/certd-server/src/controller/user/mine/user-preferences.test.ts`
   ```typescript
   test('should sync preferences', async () => { ... });
   ```

7. **Update backend models if necessary**  
   Edit:
   - `packages/ui/certd-server/src/modules/mine/service/models.ts`
   ```typescript
   export interface UserPreferences { ... }
   ```

## Testing Patterns

- **Test files** follow the `*.test.*` naming convention.
  - Example: `user-preferences.test.ts`
- **Testing framework** is not explicitly detected, but tests are written in TypeScript and likely use a standard Node.js testing library (e.g., Jest or Mocha).
- **Test Example:**
  ```typescript
  test('should update preferences', async () => {
    // Arrange
    // Act
    // Assert
  });
  ```

## Commands

| Command              | Purpose                                                      |
|----------------------|--------------------------------------------------------------|
| /extend-preferences  | Guide to extend or enhance user preference functionality     |
```

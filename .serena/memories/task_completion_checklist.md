# Development Workflow

## When a task is completed:
1. **Verify Backend:** Ensure FastAPI server starts without errors and `/status` endpoint returns expected data.
2. **Verify Frontend:** Run `npm run build` to ensure no TypeScript or build errors.
3. **Manual Check:** Start the app with `./start.sh` and verify the UI reflects the changes.
4. **Clean up:** Ensure no temporary files or `__pycache__` are committed.
5. **Documentation:** Update any relevant memory files if the architecture or conventions change.

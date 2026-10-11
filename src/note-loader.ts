import { fileURLToPath } from "node:url";
import { relative, sep } from "node:path";
import { glob, type DataStore, type Loader, type LoaderContext } from "astro/loaders";
import { noteLink } from "./publication-urls";

export const noteLoader = (): Loader => {
  const base = "./src/content/notes";
  const loader = glob({ pattern: "**/*.md", base });
  let previousWatcher: LoaderContext["watcher"];
  let previousRefresh: ((file: string) => void) | undefined;
  let pending = Promise.resolve();

  const sync = async (context: LoaderContext) => {
    const entries = new Map<string, ReturnType<DataStore["values"]>[number]>();
    const paths = new Map<string, string>();
    const store: DataStore = {
      // Every input file must be checked, including identical duplicate files
      // which the native loader's digest cache would otherwise skip.
      get: () => undefined,
      has: (id) => entries.has(id),
      keys: () => [...entries.keys()],
      values: () => [...entries.values()],
      entries: () => [...entries.entries()],
      clear: () => entries.clear(),
      delete: (id) => {
        entries.delete(id);
      },
      addModuleImport: () => {},
      set: (entry) => {
        const path = noteLink(entry.id);
        const previous = paths.get(path);
        const file = entry.filePath ?? entry.id;
        if (previous !== undefined) {
          throw new Error(
            `Note path collision: ${JSON.stringify(previous)} and ${JSON.stringify(file)} both resolve to ${path}. Rename one note or slug.`,
          );
        }
        paths.set(path, file);
        entries.set(entry.id, entry);
        return true;
      },
    };
    // Stage the native loader's entries before updating Astro's real collection.
    // This preserves its ID generation and schema parsing without allowing a
    // duplicate ID to overwrite an entry, even when file loads run concurrently.
    await loader.load({ ...context, store, watcher: undefined });
    for (const id of context.store.keys()) {
      if (!entries.has(id)) context.store.delete(id);
    }
    for (const entry of entries.values()) context.store.set(entry);
  };

  return {
    name: "validated-note-glob",
    load: async (context) => {
      // Astro removes tracked listeners before a full sync and reuses loaders.
      // Reattach for the current context, without retaining stale callbacks.
      if (previousWatcher && previousRefresh) {
        for (const event of ["add", "change", "unlink"] as const) {
          previousWatcher.off(event, previousRefresh);
        }
      }
      previousWatcher = undefined;
      previousRefresh = undefined;
      await pending;
      await sync(context);
      const watcher = context.watcher;
      if (!watcher) return;
      const directory = fileURLToPath(new URL(base, context.config.root));
      watcher.add(directory);
      const refresh = (file: string) => {
        const path = relative(directory, file);
        if (path.startsWith(".." + sep) || path === ".." || !path.endsWith(".md")) return;
        // Revalidate the complete collection on edits, additions and removals.
        // A rejected change leaves the previously accepted collection intact.
        pending = pending
          .then(() => sync(context))
          .catch((error) => {
            context.logger.error(error instanceof Error ? error.message : String(error));
          });
      };
      for (const event of ["add", "change", "unlink"] as const) watcher.on(event, refresh);
      previousWatcher = watcher;
      previousRefresh = refresh;
    },
  };
};

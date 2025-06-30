import inquirer from "inquirer";
import fs from "fs";
import path from "path";

export const generateHookFile = ({
  fileName,
  hookName,
  apiPath,
  dynamicParams = [],
  returnEntities = [],
  resourceName = "Item",
  options = { create: false, update: false, delete: false },
}) => {
  const hookExportName = hookName.startsWith("use")
    ? hookName
    : `use${hookName.charAt(0).toUpperCase() + hookName.slice(1)}`;

  const paramsStr = dynamicParams.length
    ? `{ ${dynamicParams.join(", ")} }`
    : "";
  const keyTemplate = "`" + apiPath + "`";
  const resource = resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
  const useMutation = options.create || options.update || options.delete;

  const imports = [
    `import useSWR, { mutate } from "swr";`,
    `import { authFetch } from "../util/url";`,
    useMutation ? `import { useState } from "react";` : null,
    useMutation ? `import toast from "react-hot-toast";` : null,
    options.delete ? `import { useConfirm } from "tabler-react-2";` : null,
    ``,
  ].filter(Boolean);

  const fetcher = `const fetcher = (url) => authFetch(url).then((r) => r.json());`;

  const confirmSetup = options.delete
    ? `const { confirm, ConfirmModal } = useConfirm({
  title: "Are you sure you want to delete this ${resourceName}?",
  text: "This action cannot be undone.",
});`
    : null;

  const mutationLoadingState = useMutation
    ? `const [mutationLoading, setMutationLoading] = useState(false);`
    : null;

  const createFn = options.create
    ? `
  const create${resource} = async (data) => {
    setMutationLoading(true);
    try {
      const promise = authFetch(key, {
        method: "POST",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Creating...",
        success: "Created successfully",
        error: "Error",
      });

      await mutate(key);
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };`
    : "";

  const updateFn = options.update
    ? `
  const update${resource} = async (data) => {
    setMutationLoading(true);
    try {
      const promise = authFetch(key, {
        method: "PUT",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Updating...",
        success: "Updated successfully",
        error: "Error",
      });

      await mutate(key);
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };`
    : "";

  const deleteFn = options.delete
    ? `
  const delete${resource} = async (onDelete) => {
    if (await confirm()) {
      setMutationLoading(true);
      try {
        const promise = authFetch(key, {
          method: "DELETE",
        }).then(async (r) => {
          if (!r.ok) throw new Error("Request failed");
          return r.json();
        });

        await toast.promise(promise, {
          loading: "Deleting...",
          success: "Deleted successfully",
          error: "Error deleting",
        });

        await mutate(key);
        if (onDelete) onDelete();
        return true;
      } catch {
        return false;
      } finally {
        setMutationLoading(false);
      }
    }
  };`
    : "";

  const returnBlock = [
    ...returnEntities.map((key) => `${key}: data?.${key}`),
    "loading: isLoading",
    ...(useMutation ? ["mutationLoading"] : []),
    "error",
    "refetch: () => mutate(key)",
    ...(options.create ? [`create${resource}`] : []),
    ...(options.update ? [`update${resource}`] : []),
    ...(options.delete
      ? [`delete${resource}`, "DeleteConfirmElement: ConfirmModal"]
      : []),
  ];

  const lines = [
    ...imports,
    fetcher,
    ``,
    `export const ${hookExportName} = (${paramsStr}) => {`,
    `  const key = ${keyTemplate};`,
    ``,
    `  const { data, error, isLoading } = useSWR(key, fetcher);`,
    ...(useMutation ? [`  ${mutationLoadingState}`] : []),
    ...(options.delete ? [`  ${confirmSetup}`] : []),
    createFn,
    updateFn,
    deleteFn,
    ``,
    `  return {`,
    returnBlock.map((line) => `    ${line},`).join("\n"),
    `  };`,
    `};`,
  ].filter(Boolean);

  const content = lines.join("\n").replace(/\n{3,}/g, "\n\n");

  const outputPath = path.join(process.cwd(), `${fileName}.jsx`);
  fs.writeFileSync(outputPath, content);
  console.log(`✅ Hook written to ${outputPath}`);
};

const main = async () => {
  const {
    fileName,
    resourceName,
    apiPath,
    dynamicParamsStr,
    returnEntitiesStr,
  } = await inquirer.prompt([
    {
      name: "fileName",
      message: "Output file name (no extension):",
    },
    {
      name: "resourceName",
      message: "Resource name (used for function names):",
    },
    {
      name: "apiPath",
      message: "API path (e.g., /api/events/${eventId}/thing):",
    },
    {
      name: "dynamicParamsStr",
      message: "Dynamic params (comma separated):",
    },
    {
      name: "returnEntitiesStr",
      message: "Keys from response (comma separated):",
    },
  ]);

  const defaultHookName = fileName.startsWith("use")
    ? fileName
    : `use${fileName.charAt(0).toUpperCase() + fileName.slice(1)}`;

  const { hookName } = await inquirer.prompt([
    {
      name: "hookName",
      message: `Hook name:`,
      default: defaultHookName,
    },
  ]);

  const { create, update, del } = await inquirer.prompt([
    {
      type: "confirm",
      name: "create",
      message: "Include create function?",
    },
    {
      type: "confirm",
      name: "update",
      message: "Include update function?",
    },
    {
      type: "confirm",
      name: "del",
      message: "Include delete function with confirm?",
    },
  ]);

  await generateHookFile({
    fileName,
    hookName,
    apiPath,
    resourceName,
    dynamicParams: dynamicParamsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    returnEntities: returnEntitiesStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    options: {
      create,
      update,
      delete: del,
    },
  });
};

main();

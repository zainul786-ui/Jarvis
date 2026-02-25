
// This is a placeholder for the actual AI Studio project API.
// In a real environment, this would be provided by the host.
// Global type declarations for the AI Studio project API are in types.ts.

/**
 * Fetches the entire source code of the current project.
 * @returns A promise that resolves to a record of file paths to their content.
 */
export const getProjectSourceCode = async (): Promise<Record<string, string>> => {
    try {
        if (!window.aistudio || !window.aistudio.project) {
            console.warn("Project API not available.");
            return {};
        }

        const files = await window.aistudio.project.tree();
        const sourceCode: Record<string, string> = {};

        // Exclude binary files or large assets if necessary
        const sourceFilePromises = files
            .filter(file => /\.(tsx|ts|html|css|json)$/.test(file) && !file.includes('node_modules'))
            .map(async (file) => {
                const content = await window.aistudio.project.readFile(file);
                return { file, content };
            });

        const results = await Promise.all(sourceFilePromises);

        for (const { file, content } of results) {
            sourceCode[file] = content;
        }

        return sourceCode;
    } catch (error) {
        console.error("Error fetching project source code:", error);
        return {};
    }
};

import { ESLint } from "eslint";
import js from "@eslint/js"; // <-- New import required for v9+

export const runStaticAnalysis = async (codeFiles) => {
    // Initialize ESLint with a base configuration
    // We use basic recommended rules so it works out of the box
    const eslint = new ESLint({
        overrideConfigFile: true, // Ignore any random config files in the project
        overrideConfig: [
            {
                files: ["**/*"],
                rules: js.configs.recommended.rules,
                languageOptions: {
                    ecmaVersion: "latest",
                    sourceType: "module",
                }
            }
        ]
    });

    let rawOutput = [];
    let parsedFindings = [];
    let errorCount = 0;
    let warningCount = 0;
    
    // Track skipped files to give visibility to the user
    const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx'];
    let supportedCount = 0;
    let skippedCount = 0;

    for (const file of codeFiles) {
        const ext = file.extension?.toLowerCase() || '';
        const lang = file.language?.toLowerCase() || '';
        
        // Check if file is JavaScript/TypeScript
        if (supportedExtensions.includes(ext) || lang === 'javascript' || lang === 'typescript') {
            supportedCount++;
            try {
                // Lint the text string directly from memory
                const results = await eslint.lintText(file.content, { filePath: file.fileName });
                
                // If ESLint ignored it despite our check (e.g. no config matches), skip it
                if (results && results[0] && results[0].messages && results[0].messages[0]?.message.includes('ignored')) {
                    continue; 
                }

                rawOutput.push(...results);

                // Parse ESLint results into our Prisma Finding format
                for (const result of results) {
                    errorCount += result.errorCount;
                    warningCount += result.warningCount;

                    for (const message of result.messages) {
                        parsedFindings.push({
                            source: 'STATIC_ANALYSIS',
                            severity: message.severity === 2 ? 'HIGH' : 'MEDIUM', // ESLint 2=Error, 1=Warning
                            type: message.ruleId || 'Syntax Error',
                            title: `ESLint: ${message.ruleId || 'Parsing Error'}`,
                            description: message.message,
                            fileName: file.fileName,
                            lineNumber: message.line || null,
                        });
                    }
                }
            } catch (err) {
                console.error(`Failed to lint file ${file.fileName}:`, err);
            }
        } else {
            skippedCount++;
            // We gently skip it without throwing errors
            console.log(`Skipping Static Analysis for ${file.fileName} (unsupported language: ${lang || ext})`);
        }
    }

    // Include summary of skipped files in the report
    if (skippedCount > 0 && supportedCount === 0) {
        console.log(`No supported files found for Static Analysis. Skipped ${skippedCount} file(s).`);
    }

    return {
        summary: {
            totalFilesAnalyzed: supportedCount,
            totalFilesSkipped: skippedCount,
            errorCount,
            warningCount
        },
        rawOutput,
        findings: parsedFindings
    };
};
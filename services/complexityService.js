

export const analyzeComplexity = (codeFiles) => {
    let totalLines = 0;
    let totalFunctions = 0;
    let totalClasses = 0;
    let totalComplexity = 0;
    let breakdown = [];

    codeFiles.forEach(file => {
        const content = file.content;

        // 1. Lines of Code (Split by newline, ignore empty lines)
        const lines = content.split('\n').filter(line => line.trim().length > 0).length;
        totalLines += lines;

        // 2. Class Count (Matches 'class Name' across most languages)
        const classMatches = content.match(/\bclass\s+\w+/g) || [];
        totalClasses += classMatches.length;

        // 3. Function Count (Heuristic for standard functions, arrow functions, and Python defs)
        const functionMatches = content.match(/\bfunction\s+\w+|\bdef\s+\w+|\w+\s*\(.*?\)\s*\{|\=\s*\([^)]*\)\s*\=\>/g) || [];
        totalFunctions += functionMatches.length;

        // 4. Cyclomatic Complexity (Base is 1 per file. Add 1 for every branching/looping keyword)
        const ccMatches = content.match(/\b(if|while|for|case|catch)\b/g) || [];
        const logicalMatches = content.match(/(&&|\|\||\?)/g) || []; // And, Or, Ternary operators

        const fileComplexity = 1 + ccMatches.length + logicalMatches.length;
        totalComplexity += fileComplexity;

        // Store file-specific breakdown
        breakdown.push({
            fileName: file.fileName,
            linesOfCode: lines,
            classCount: classMatches.length,
            functionCount: functionMatches.length,
            cyclomaticComplexity: fileComplexity
        });
    });

    // 5. Maintainability Score (Simplified heuristic: 100 - (Complexity penalty) - (Size penalty))
    let maintainability = 100 - (totalComplexity * 1.5) - (totalLines * 0.1);
    maintainability = Math.max(0, Math.min(100, maintainability)); // Clamp between 0 and 100

    return {
        linesOfCode: totalLines,
        classCount: totalClasses,
        functionCount: totalFunctions,
        cyclomaticComplexity: totalComplexity,
        maintainability: parseFloat(maintainability.toFixed(2)),
        breakdown
    };
};
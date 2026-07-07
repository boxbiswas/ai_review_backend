import { prisma } from "../lib/prisma.js";
import { runFullPipeline } from "../services/pipelineService.js";

// Helper to map file extensions to language names automatically
const detectLanguage = (extension) => {
    const extMap = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.cs': 'csharp',
        '.go': 'go',
        '.rs': 'rust',
        '.php': 'php',
        '.html': 'html',
        '.css': 'css',
        '.json': 'json'
    };
    return extMap[extension?.toLowerCase()] || 'plaintext';
};

const getExtensionForLanguage = (language) => {
    const langMap = {
        'javascript': '.js',
        'typescript': '.ts',
        'python': '.py',
        'java': '.java',
        'cpp': '.cpp',
        'csharp': '.cs',
        'go': '.go',
        'rust': '.rs',
        'php': '.php'
    };
    return langMap[language?.toLowerCase()] || '.txt';
};


export const submitCode = async (req, res) => {
    try {
        const userId = req.user.id; // Extracted via isLoggedIn middleware
        const { title, description, submissionType, language, pastedCode } = req.body;

        // Ensure we have a valid submission type
        if (!['PASTED_CODE', 'FILE_UPLOAD'].includes(submissionType)) {
            return res.status(400).json({ message: "Invalid submission type. Must be PASTED_CODE or FILE_UPLOAD" });
        }

        let codeFilesData = [];

        // ----------------------------------------------------
        // SCENARIO A: User Pasted Code
        // ----------------------------------------------------
        if (submissionType === 'PASTED_CODE') {
            if (!pastedCode) {
                return res.status(400).json({ message: "No code provided in pastedCode field" });
            }

            // STRICT ENFORCEMENT: Language is required for pasted code
            if (!language) {
                return res.status(400).json({ message: "Language selection is required when pasting code." });
            }

            const ext = getExtensionForLanguage(language);

            codeFilesData.push({
                fileName: `pasted_snippet${ext}`,
                extension: ext,
                language: language,
                content: pastedCode,
                size: Buffer.byteLength(pastedCode, 'utf8') // Calculate byte size
            });
        }

        // ----------------------------------------------------
        // SCENARIO B: User Uploaded Files
        // ----------------------------------------------------
        else if (submissionType === 'FILE_UPLOAD') {
            // req.files is populated by the multer middleware
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ message: "No files were uploaded" });
            }

            // Loop through uploaded files and extract their contents
            req.files.forEach(file => {
                const content = file.buffer.toString('utf8'); // Convert memory buffer to text string
                const lastDotIndex = file.originalname.lastIndexOf('.');
                const extension = lastDotIndex !== -1 && lastDotIndex !== 0 
                    ? file.originalname.substring(lastDotIndex).toLowerCase() 
                    : '';

                codeFilesData.push({
                    fileName: file.originalname,
                    extension: extension || '.txt',
                    // AUTOMATIC DETECTION: Figure it out from the extension
                    language: detectLanguage(extension),
                    content: content,
                    size: file.size
                });
            });
        }

        // ----------------------------------------------------
        // SAVE TO DATABASE
        // ----------------------------------------------------
        // Create the review and attach the code files in one transaction
        const newReview = await prisma.review.create({
            data: {
                userId,
                title,
                description,
                submissionType,
                // Top level review language tracking
                language: submissionType === 'PASTED_CODE' ? language : (codeFilesData.length > 0 ? codeFilesData[0].language : 'mixed'),
                status: 'PENDING', // Ready for Phase 4 analysis
                codeFiles: {
                    create: codeFilesData
                }
            },
            include: {
                codeFiles: true // Return the newly created files in the response
            }
        });

        // Trigger the backend pipeline asynchronously
        // Do NOT await this so the response returns immediately
        runFullPipeline(newReview.id).catch(err => console.error("Pipeline kick-off failed:", err));

        res.status(201).json({
            message: "Code submitted successfully and saved to database.",
            review: newReview
        });

    } catch (error) {
        console.error("CODE SUBMISSION ERROR:", error);
        res.status(500).json({ message: "Failed to submit code" });
    }
};
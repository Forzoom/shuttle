import fs from 'fs';
import path from 'path';

export function writeFileSync(filePath: string, content: string) {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
}

/**
 * 处理文件
 * @param input 可以是文件/文件夹
 * @param output 
 * @param callback 
 */
export async function recursive(input: string, output: string, callback: any) {
    const queue: string[] = [ input ];

    // 深度优先搜索
    while (queue.length > 0) {
        const filePath = queue.shift();
        if (!filePath) {
            continue;
        }
        const stats = fs.statSync(filePath);
        const isDirectory = stats.isDirectory();
        if (isDirectory) {
            // 如果是文件夹，加入queue
            const children = fs.readdirSync(filePath);
            queue.unshift(...children.map(child => path.join(filePath, child)));
        } else {
            const outputPath = output + filePath.substr(input.length);
            fs.mkdirSync(path.dirname(outputPath), {
                recursive: true,
                mode: 0o755,
            });
            await callback(filePath, outputPath);
        }
    }
}

export function extWith(extname: string, path?: string | null) {
    if (!path) {
        return false;
    }
    return path.endsWith(extname);
}

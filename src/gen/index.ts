import { VueNode } from '@/node';
import { GeneratorPlugin } from 'types';

/**
 * 生成器
 */
export abstract class Generator {
    public plugins: GeneratorPlugin[] = [];

    public constructor(plugins?: GeneratorPlugin[]) {
        if (plugins) {
            this.plugins = plugins;
        }
    }

    public addPlugin(plugin: GeneratorPlugin) {
        this.plugins.push(plugin);
    }

    /** 处理，生成代码 */
    public abstract handleCode(vueNode: VueNode): string;
    /** 处理，生成文件 */
    public abstract handleFile(vueNode: VueNode, outputPath: string): void;
}

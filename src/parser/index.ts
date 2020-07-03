import { VueNode } from '@/node';

export abstract class Parser {
    public plugins: any;

    public constructor(plugins?: any) {
        this.plugins = plugins || [];
    }

    /**
     * 添加新的插件
     * @param plugin 插件内容
     */
    public addPlugin(plugin: any) {
        this.plugins.push(plugin);
    }

    /**
     * 处理代码内容
     */
    public abstract handleCode(code: string): VueNode;
    public abstract handleFile(filePath: string): VueNode;
}

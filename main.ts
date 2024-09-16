import { App, Notice, Plugin, PluginSettingTab, Setting, moment, normalizePath } from 'obsidian';

interface KettleSettings {
	location: string;
	format: string;
}

const DEFAULT_SETTINGS: KettleSettings = {
	location: '',
	format: 'YYYYMMDD_kkmmss',
}

export default class Kettle extends Plugin {
	settings: KettleSettings;

	async createUniqueNote(): Promise<void> {
		const name = moment().utc().format(this.settings.format);
		const timestamp = moment().utc().format("YYYY-MM-DDTHH:mm:ss[Z]");
		const path = normalizePath(`/${this.settings.location}/${name}.md`);
		console.log(path)

		try {
			console.log(this.app)
			const fileExists = await this.app.vault.adapter.exists(path);
			if (fileExists) {
				throw new Error(`${path} already exists!`);
			}

			// Create the file and open it in the active leaf
			const file = await this.app.vault.create(
				path,
				`---\ncreated: ${timestamp}\n---\n\n`
			);
			let leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);

		} catch (error) {
			new Notice(error.toString());
		}
	}

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('file-stack', 'Create new unique note', async (evt: MouseEvent) => {
			await this.createUniqueNote()
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'create-new-unique-note',
			name: 'Create new unique note',
			callback: async () => {
				await this.createUniqueNote()
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new KettleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class KettleSettingTab extends PluginSettingTab {
	plugin: Kettle;

	constructor(app: App, plugin: Kettle) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('New file location')
			.setDesc('The folder path to create the new unique note.')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.location)
				.onChange(async (value) => {
					this.plugin.settings.location = value;
					await this.plugin.saveSettings();
				}));

		const setting = new Setting(containerEl)
		setting.setName('Unique prefix format')
			.setDesc(this.formatExample())
			.addText(text => text
				.setPlaceholder('YYYYMMDD_kkmmss')
				.setValue(this.plugin.settings.format)
				.onChange(async (value) => {
					this.plugin.settings.format = value;
					await this.plugin.saveSettings();
					setting.setDesc(this.formatExample())
				}));
	}

	formatExample(): string {
		const example = moment().utc().format(this.plugin.settings.format)
		return `moment.js format string. Currently: ${example}`
	}
}

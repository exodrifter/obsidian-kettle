import { App, Notice, Plugin, PluginSettingTab, Setting, moment, normalizePath } from 'obsidian';

const DEFAULT_FILE_FORMAT = 'YYYYMMDDHHmmss'
const DEFAULT_META_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ'

interface KettleSettings {
	location: string;
	fileFormat: string;
	fileFormatInUTC: boolean;
	metaFormat: string;
	metaFormatInUTC: boolean;
}

const DEFAULT_SETTINGS: KettleSettings = {
	location: '',
	fileFormat: DEFAULT_FILE_FORMAT,
	fileFormatInUTC: true,
	metaFormat: DEFAULT_META_FORMAT,
	metaFormatInUTC: false,
}

export default class Kettle extends Plugin {
	settings: KettleSettings;

	async createUniqueNote(): Promise<void> {
		const name = this.settings.fileFormatInUTC
			? moment().utc().format(this.settings.fileFormat)
			: moment().format(this.settings.fileFormat)
		const path = normalizePath(`/${this.settings.location}/${name}.md`);

		try {
			const fileExists = await this.app.vault.adapter.exists(path);
			if (fileExists) {
				throw new Error(`${path} already exists!`);
			}

			// Create the file and open it in the active leaf
			const created = this.settings.metaFormatInUTC
				? moment().utc().format(this.settings.metaFormat)
				: moment().format(this.settings.metaFormat)
			const file = await this.app.vault.create(
				path,
				`---\ncreated: ${created}\n---\n\n`
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

		const kettle = this.plugin.settings

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

		const fileSetting = new Setting(containerEl)
		fileSetting.setName("Filename format")
			.setDesc(this.formatExample(kettle.fileFormat, kettle.fileFormatInUTC))
			.addText(text => text
				.setPlaceholder('YYYYMMDDHHmmss')
				.setValue(kettle.fileFormat)
				.onChange(async (value) => {
					this.plugin.settings.fileFormat = value;
					await this.plugin.saveSettings();
					fileSetting.setDesc(this.formatExample(kettle.fileFormat, kettle.fileFormatInUTC))
				}));

		new Setting(containerEl).setName("Filename format in UTC")
			.setDesc("If true, render the filename format in UTC.")
			.addToggle(v => v
				.setValue(kettle.fileFormatInUTC)
				.onChange(async (value) => {
					this.plugin.settings.fileFormatInUTC = value;
					await this.plugin.saveSettings();
					fileSetting.setDesc(this.formatExample(kettle.fileFormat, kettle.fileFormatInUTC))
				}));

		const metaSetting = new Setting(containerEl)
		metaSetting.setName('Metadata format')
			.setDesc(this.formatExample(kettle.metaFormat, kettle.metaFormatInUTC))
			.addText(text => text
				.setPlaceholder(DEFAULT_META_FORMAT)
				.setValue(kettle.metaFormat)
				.onChange(async (value) => {
					this.plugin.settings.metaFormat = value;
					await this.plugin.saveSettings();
					metaSetting.setDesc(this.formatExample(kettle.metaFormat, kettle.metaFormatInUTC))
				}));

		new Setting(containerEl).setName("Metadata format in UTC")
			.setDesc("If true, render the metadata format in UTC.")
			.addToggle(v => v
				.setValue(kettle.metaFormatInUTC)
				.onChange(async (value) => {
					this.plugin.settings.metaFormatInUTC = value;
					await this.plugin.saveSettings();
					metaSetting.setDesc(this.formatExample(kettle.metaFormat, kettle.metaFormatInUTC))
				}));
	}

	format(f: string, inUTC: boolean): string {
		return inUTC ? moment().utc().format(f) : moment().format(f)
	}

	formatExample(f: string, inUTC: boolean): string {
		return `moment.js format string. Currently: ${this.format(f, inUTC)}`
	}
}

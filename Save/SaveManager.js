export class SaveManager {

    constructor() {
        this.storageKey = "slingshift_save";

        this.data = {
            unlockedLevels: [0],
            completedLevels: [],
            achievements: [],
            settings: {}
        };

        this.load();
    }

    load() {
        const saved = localStorage.getItem(this.storageKey);

        if (saved) {
            this.data = {
                ...this.data,
                ...JSON.parse(saved)
            };
        }
    }

    save() {
        localStorage.setItem(
            this.storageKey,
            JSON.stringify(this.data)
        );
    }

    exportSave() {

        const saveData = JSON.stringify(
            this.data,
            null,
            4
        );

        const blob = new Blob(
            [saveData],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = "slingshift_save.json";

        link.click();

        URL.revokeObjectURL(url);
    }

    async importSave(file) {

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.unlockedLevels ||
                !data.completedLevels ||
                !data.achievements) {
                throw new Error("Invalid save file");
            }

            this.data = data;

            this.save();

            return true;

        } catch (error) {
            console.error("Failed to import save:", error);
            return false;
        }
    }
}


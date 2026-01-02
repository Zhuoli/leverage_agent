/**
 * Skills Manager
 * Manages custom AI skills and prompts
 */

import { IPCService } from '../../services/IPCService';

interface Skill {
    id: string;
    name: string;
    description: string;
    prompt: string;
    enabled: boolean;
}

export class SkillsManager {
    private container: HTMLElement | null;
    private skillsList: HTMLElement | null;
    private addButton: HTMLButtonElement | null;
    private skills: Skill[];

    constructor() {
        this.container = null;
        this.skillsList = null;
        this.addButton = null;
        this.skills = [];
    }

    /**
     * Initialize skills manager
     */
    initialize(): void {
        this.container = document.getElementById('skillsView');
        if (!this.container) {
            console.error('[SkillsManager] Container not found');
            return;
        }

        this.skillsList = this.container.querySelector('#skillsList') as HTMLElement;
        this.addButton = this.container.querySelector('#addSkill') as HTMLButtonElement;

        if (!this.skillsList || !this.addButton) {
            console.error('[SkillsManager] Required elements not found');
            return;
        }

        this.setupEventListeners();
        this.loadSkills();
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        if (!this.addButton) return;
        this.addButton.addEventListener('click', () => this.addSkill());
    }

    /**
     * Load skills from storage
     */
    private async loadSkills(): Promise<void> {
        try {
            this.skills = await IPCService.getSkills();
            this.renderSkills();
        } catch (error) {
            console.error('[SkillsManager] Failed to load skills:', error);
        }
    }

    /**
     * Render skills list
     */
    private renderSkills(): void {
        if (!this.skillsList) return;

        this.skillsList.innerHTML = '';

        if (this.skills.length === 0) {
            this.skillsList.innerHTML = '<div class="empty-state">No skills configured</div>';
            return;
        }

        this.skills.forEach((skill, index) => {
            const skillItem = this.createSkillItem(skill, index);
            if (this.skillsList) {
                this.skillsList.appendChild(skillItem);
            }
        });
    }

    /**
     * Create skill item element
     */
    private createSkillItem(skill: Skill, index: number): HTMLElement {
        const div = document.createElement('div');
        div.className = 'skill-item';

        const header = document.createElement('div');
        header.className = 'skill-header';

        const name = document.createElement('span');
        name.className = 'skill-name';
        name.textContent = skill.name;

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.checked = skill.enabled;
        toggle.addEventListener('change', () => this.toggleSkill(index, toggle.checked));

        const actions = document.createElement('div');
        actions.className = 'skill-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'skill-edit';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => this.editSkill(index));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'skill-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => this.deleteSkill(index));

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        header.appendChild(name);
        header.appendChild(toggle);
        header.appendChild(actions);

        const description = document.createElement('div');
        description.className = 'skill-description';
        description.textContent = skill.description;

        div.appendChild(header);
        div.appendChild(description);

        return div;
    }

    /**
     * Add new skill
     */
    private addSkill(): void {
        const name = prompt('Skill name:');
        if (!name) return;

        const description = prompt('Description:');
        if (!description) return;

        const promptText = prompt('Prompt template:');
        if (!promptText) return;

        const newSkill: Skill = {
            id: `skill-${Date.now()}`,
            name,
            description,
            prompt: promptText,
            enabled: true
        };

        this.skills.push(newSkill);
        this.saveSkills();
        this.renderSkills();
    }

    /**
     * Edit existing skill
     */
    private editSkill(index: number): void {
        if (index < 0 || index >= this.skills.length) return;

        const skill = this.skills[index];

        const name = prompt('Skill name:', skill.name);
        if (name === null) return;

        const description = prompt('Description:', skill.description);
        if (description === null) return;

        const promptText = prompt('Prompt template:', skill.prompt);
        if (promptText === null) return;

        this.skills[index] = {
            ...skill,
            name,
            description,
            prompt: promptText
        };

        this.saveSkills();
        this.renderSkills();
    }

    /**
     * Toggle skill enabled state
     */
    private toggleSkill(index: number, enabled: boolean): void {
        if (index >= 0 && index < this.skills.length) {
            this.skills[index].enabled = enabled;
            this.saveSkills();
        }
    }

    /**
     * Delete skill
     */
    private deleteSkill(index: number): void {
        if (confirm('Are you sure you want to delete this skill?')) {
            this.skills.splice(index, 1);
            this.saveSkills();
            this.renderSkills();
        }
    }

    /**
     * Save skills to storage
     */
    private async saveSkills(): Promise<void> {
        try {
            await IPCService.saveSkills(this.skills);
        } catch (error) {
            console.error('[SkillsManager] Failed to save skills:', error);
            alert('Failed to save skills');
        }
    }
}

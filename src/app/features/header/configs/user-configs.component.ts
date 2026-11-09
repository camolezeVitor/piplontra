import { Component, inject } from "@angular/core";
import { ColorPickerComponent } from "@shared/components/color-picker/color-picker.component";
import { UserService } from "@shared/services/user.service";
import { AdminService } from "@shared/services/admin.service";

@Component({
    selector: 'pip-user-configs',
    template: `
    <form class="flex flex-col gap-4" (submit)="$event.preventDefault()">
        <div class="flex flex-row items-center gap-4">
            <label class="cursor-pointer shrink-0" title="Trocar avatar">
                @if (user.avatar(); as avatar) {
                    <img [src]="avatar" alt="Avatar" class="w-16 h-16 object-cover border border-white hover:outline-2 hover:outline-offset-2 hover:outline-white" />
                } @else {
                    <span class="w-16 h-16 flex items-center justify-center border border-dashed border-white text-xs hover:outline-2 hover:outline-offset-2 hover:outline-white">AVATAR</span>
                }
                <input type="file" accept="image/*" class="hidden" (change)="onAvatar($event)" />
            </label>
            <div class="flex flex-col gap-1 min-w-0">
                <span class="text-xs opacity-80">COR</span>
                <pip-color-picker [value]="user.color()" (valueChange)="user.setColor($event)" />
            </div>
        </div>

        <label class="flex flex-col gap-1">
            <span class="text-xs opacity-80">APELIDO</span>
            <input class="field" type="text" autocomplete="nickname" [value]="user.nickname()" (change)="user.setNickname($any($event.target).value)" />
        </label>

        <label class="flex flex-col gap-1">
            <span class="text-xs opacity-80">&#64;USUÁRIO</span>
            <input class="field opacity-60" type="text" autocomplete="username" [value]="user.username()" readonly title="É o seu login — não dá pra trocar." />
        </label>

        <label class="flex flex-col gap-1">
            <span class="text-xs opacity-80">NOVA SENHA</span>
            <input #passwordInput class="field" type="password" autocomplete="new-password" placeholder="deixe vazio pra manter" (change)="user.setPassword(passwordInput.value); passwordInput.value = ''" />
        </label>

        <label class="flex flex-row items-center gap-2 pt-2 border-t border-white/30">
            <input type="checkbox" [checked]="admin.isAdmin()" disabled />
            <span class="text-xs opacity-80">MESTRE (definido no servidor, em MASTER_USERNAMES)</span>
        </label>
    </form>
    `,
    styles: `
    .field {
        background: transparent;
        color: white;
        border: 1px solid white;
        padding: 0.25rem 0.5rem;
        outline-offset: 2px;
    }
    .field:focus { outline: 2px solid white; }
    `,
    imports: [ColorPickerComponent],
})
export class UserConfigsComponent {
    protected readonly user = inject(UserService);
    protected readonly admin = inject(AdminService);

    protected onAvatar(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => this.user.setAvatar(reader.result as string);
        reader.readAsDataURL(file);
    }
}

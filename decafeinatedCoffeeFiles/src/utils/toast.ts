export function toast(message: string): void {
    const toastElement = document.createElement("div");
    toastElement.className = "toast";
    toastElement.textContent = message;
    document.body.appendChild(toastElement);
    setTimeout(() => {
        document.body.removeChild(toastElement);
    }, 3000);
}
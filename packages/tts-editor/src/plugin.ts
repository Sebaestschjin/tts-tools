import { OutputChannel, StatusBarAlignment, StatusBarItem, window } from "vscode";

export class Plugin {
  private output: OutputChannel;
  private status: StatusBarItem;

  /**
   * @param output Output channel where logs will be written to
   */
  public constructor() {
    this.output = window.createOutputChannel("TTS Edtior");
    this.status = window.createStatusBarItem("tts.status", StatusBarAlignment.Left, -1);

    this.setBaseStatus();
  }

  startProgress = (message: string) => {
    this.status.text = `$(loading~spin) ${message}`;
  };

  endProgress = () => {
    this.setBaseStatus();
  };

  setStatus = (result: string) => {
    this.setBaseStatus(result);
    setTimeout(() => this.setBaseStatus(), 5000);
  };

  showOutput = () => {
    this.output.show();
  };

  debug = (message: string) => {
    console.debug(message);
  };

  info = (message: string) => {
    console.log(message);
    this.output.appendLine(message);
  };

  error = (message: string) => {
    console.error(message);
    this.output.appendLine(message);
  };

  private setBaseStatus = (postfix?: string) => {
    let text = "TTS";
    if (postfix) {
      text += ` - ${postfix}`;
    }

    this.status.text = text;
    this.status.show();
  };
}

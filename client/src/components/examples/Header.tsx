import { ThemeProvider } from "../ThemeProvider";
import { Header } from "../Header";

export default function HeaderExample() {
  return (
    <ThemeProvider>
      <Header
        botStatus="online"
        serverName="Undisputed Boxing League"
        onRefresh={() => console.log("Refresh clicked")}
        onSettings={() => console.log("Settings clicked")}
      />
    </ThemeProvider>
  );
}

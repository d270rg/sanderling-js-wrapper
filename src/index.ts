import * as plugins from "@plugins";
import { select } from "@inquirer/prompts";

async function query() {
  const answer = await select({
    message: "Select plugin",
    choices: Object.keys(plugins).map((importedPlugin) => {
      const plugin = new plugins[importedPlugin]()
      return {
        name: importedPlugin,
        value: plugin,
        description: plugin.getDescription(),
      }
     
    }),
  });

  await answer.execute();
}

void query();
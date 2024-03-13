import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import buildContracts = require('azure-devops-node-api/interfaces/BuildInterfaces');
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import fs = require('fs');

export function getCommand(args: string[]): CreateDefinition {
    return new CreateDefinition(args);
}

export interface CreateDefinitionArguments extends CoreArguments {
    name: args.StringArgument
    definitionPath: args.StringArgument
}

export class CreateDefinition extends TfCommand<CreateDefinitionArguments, buildContracts.DefinitionReference> {
    protected serverCommand = true;
    protected description = "Create a build definition";

    protected getHelpArgs(): string[] {
        return ["project", "definitionPath", "name"];
    }

    protected setCommandArgs(): void {
        super.setCommandArgs();

        this.registerCommandArgument("name", "Name of the Build Definition", "", args.StringArgument);
        this.registerCommandArgument("definitionPath", "Definition path", "Local path to a Build Definition.", args.ExistingFilePathsArgument);
    }

    public exec(): Promise<buildContracts.DefinitionReference> {
        var api = this.webApi.getBuildApi();

        return Promise.all<number | string | boolean>([
            this.commandArgs.project.val(),
            this.commandArgs.name.val(),
            this.commandArgs.definitionPath.val(),
        ]).then((values) => {
            const [project, name, definitionPath] = values;
            let definition: buildContracts.BuildDefinition = JSON.parse(fs.readFileSync(definitionPath.toString(), 'utf-8'));
            definition.name = name as string;

            trace.debug("Creating build definition %s...", name);
                return api.then((defapi) => { return defapi.createDefinition(definition, project as string).then((definition) => {
                    return definition;
                });
            });
        });
    }

    public friendlyOutput(definition: buildContracts.BuildDefinition): void {
        trace.println();
        trace.info('id            : %s', definition.id);
        trace.info('name          : %s', definition.name);
        trace.info('type          : %s', definition.type == buildContracts.DefinitionType.Xaml ? "Xaml" : "Build");
    }
}

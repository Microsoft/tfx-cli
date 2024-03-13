import { TfCommand, CoreArguments } from "../../../lib/tfcommand";
import buildContracts = require('azure-devops-node-api/interfaces/BuildInterfaces');
import args = require("../../../lib/arguments");
import trace = require('../../../lib/trace');
import fs = require("fs");

export function getCommand(args: string[]): UpdateDefinition {
    return new UpdateDefinition(args);
}

export interface UpdateDefinitionArguments extends CoreArguments {
    definitionId: args.IntArgument
    definitionPath: args.StringArgument
}

export class UpdateDefinition extends TfCommand<UpdateDefinitionArguments, buildContracts.DefinitionReference> {
    protected serverCommand = true;
    protected description = "Update build definition";
    protected getHelpArgs(): string[] {
        return ["project", "definitionId", "definitionPath"];
    }

    protected setCommandArgs(): void {
        super.setCommandArgs();

        this.registerCommandArgument("definitionId", "Build Definition ID", "Identifies a build definition.", args.IntArgument, null);
        this.registerCommandArgument("definitionPath", "Definition Path", "Local path to a Build Definition.", args.ExistingFilePathsArgument);
    }

    public exec(): Promise<buildContracts.DefinitionReference> {
        var api = this.webApi.getBuildApi();

        return Promise.all<number | string | boolean>([
            this.commandArgs.project.val(),
            this.commandArgs.definitionId.val(),
            this.commandArgs.definitionPath.val(),
        ]).then((values) => {
            const [project, definitionId, definitionPath] = values;
            // Get the current definition so we can grab the revision id
            trace.debug("Retrieving build definition %s...", definitionId);
            return api.then((defapi) => {
                return defapi.getDefinition(project as string, definitionId as number).then(currentDefinition => {
                    trace.debug("Reading build definition from %s...", definitionPath.toString());
                    let definition: buildContracts.BuildDefinition = JSON.parse(fs.readFileSync(definitionPath.toString(), 'utf-8'));
                    definition.id = currentDefinition.id;
                    definition.revision = currentDefinition.revision;
                    trace.debug("Updating build definition %s...", definitionId);
                    return api.then((defapi) => {
                        return defapi.updateDefinition(definition, project as string, definitionId as number,currentDefinition.id,currentDefinition.revision).then((definition) => {
                            return definition;
                        });
                    });
                })
            });
        });
    }

    public friendlyOutput(definition: buildContracts.BuildDefinition): void {
        trace.println();
        trace.info('id            : %s', definition.id);
        trace.info('name          : %s', definition.name);
        trace.info('revision      : %s', definition.revision);
    }
}

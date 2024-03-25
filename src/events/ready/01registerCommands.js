const {testServer} = require('../../../config.json');
const getApplicationCommands = require('../../utils/getApplicationCommands');
const getLocalCommands = require('../../utils/getLocalCommands');
const areCommandsDifferent = require('../../utils/areCommandsDifferent');


module.exports = async (client) =>{
    try {
        const localCommands = getLocalCommands();
        // const testServerId = client.guilds.cache.get(testServer);
        // const applicationCommands = await testServerId.commands.fetch();
        // await Promise.all(applicationCommands.map(command => command.delete()));
        // console.log('All application commands deleted successfully.');
        const applicationCommands = await getApplicationCommands(client);
        const commandsToDelete = applicationCommands.cache.filter((existingCommand) =>
            !localCommands.find((cmd) => cmd.name === existingCommand.name)
        );

        for (const commandToDelete of commandsToDelete.values()) {
            await applicationCommands.delete(commandToDelete.id);
            console.log(`Deleted Command: ${commandToDelete.name}.`);
         }
        for(const localCommand of localCommands){
            const {name , description , options} = localCommand;

            const existingCommands = await applicationCommands.cache.find(
                (cmd) => cmd.name === name
            )
            if(existingCommands){
                if(localCommand.deleted){
                    await applicationCommands.delete(existingCommands.id);
                    console.log(`Deleted Command : ${name}.`);
                    continue;
                }
                if(areCommandsDifferent(existingCommands,localCommand)){
                    await applicationCommands.edit(existingCommands.id,{
                        description,
                        options,
                    });
                    console.log(`Edited Command: ${name}`);
                };
            }else{
                if(localCommand.deleted){
                    console.log(`Skipping Registering of Command : ${name}`);
                    continue;
                }
                await applicationCommands.create({
                    name,
                    description,
                    options,
                });
                console.log(`Registered Command: ${name}`);
            }
        }
    } catch (error) {
        console.log(`Error: ${error}`);
    }
};
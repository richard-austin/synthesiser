package synthesiser.server.controllers

import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import synthesiser.server.command.GetSettingsCommand
import synthesiser.server.command.SaveConfigCommand
import tools.jackson.databind.ObjectMapper
import tools.jackson.databind.ObjectWriter

import java.nio.file.Files
import java.nio.file.Path

@RestController
@RequestMapping("/syn")
class SynthController {
    private final configFileDir = Path.of(System.getProperty("user.home"), "configs")

    @PostMapping('/saveConfig')
    def saveConfig(@RequestBody SaveConfigCommand cmd) {
        try {
            ObjectWriter ow = new ObjectMapper().writer().withDefaultPrettyPrinter()
            String json = ow.writeValueAsString(cmd.synthSettings)
            def fileName = cmd.fileName
            if(!fileName.endsWithIgnoreCase('.json'))
                fileName += '.json'

            def path = configFileDir
            Files.createDirectories(path)
            path = Path.of(path.toString(), fileName)
            File file = path.toFile()
            FileWriter fileWriter = new FileWriter(file)
            fileWriter.write(json)
            fileWriter.flush()
            fileWriter.close()
            return ResponseEntity.ok().body(fileName + " successfully saved")
        }
        catch (Exception ex) {
            return ResponseEntity
                    .internalServerError()
                    .body([exception: ex.getClass(), message: ex.getMessage()])
        }
    }

    @PostMapping('/getConfigFileList')
    def getConfigFileList() {
        try {
            def files = new File(configFileDir.toString()).listFiles()
            def fileNames = new ArrayList()
            for(f in files) {
                def fileName = Path.of(f.toURI()).toFile().getName()
                def fileNameNoExt = fileName.substring(0, fileName.lastIndexOf('.'))
                fileNames.add(fileNameNoExt)
            }
            return ResponseEntity.ok().body(fileNames)
        }
        catch(Exception ex) {
            return ResponseEntity.internalServerError().body([exception: ex.getClass(), message: ex.getMessage()])
        }
    }

    @PostMapping('getSettings')
    def getSettings(@RequestBody GetSettingsCommand cmd) {
        try {
            def configFile = Files.readString(Path.of(configFileDir.toString(), cmd.fileName+".json"))
            ObjectMapper mapper = new ObjectMapper()
            Map<String, Object> map = mapper.readValue(configFile, Map.class)
            return ResponseEntity.ok().body(map)
        }
        catch(Exception ex) {
            return ResponseEntity.internalServerError().body([exception: ex.getClass(), message: ex.getMessage()])
        }
    }
}

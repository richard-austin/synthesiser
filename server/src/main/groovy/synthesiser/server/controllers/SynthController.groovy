package synthesiser.server.controllers

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import synthesiser.server.command.DeleteConfigCommand
import synthesiser.server.command.GetSettingsCommand
import synthesiser.server.command.RenameConfigFileCommand
import synthesiser.server.command.SaveConfigCommand
import tools.jackson.databind.ObjectMapper
import tools.jackson.databind.ObjectWriter

import java.nio.file.FileAlreadyExistsException
import java.nio.file.Files
import java.nio.file.NoSuchFileException
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.util.stream.Collectors

@RestController
@RequestMapping("/syn")
class SynthController {

    private final Path configFileDir = Path.of(System.getProperty("user.home"), "configs2").toAbsolutePath().normalize()

    private Path resolveSafePath(String fileName) {
        if (fileName == null || fileName.contains("..")) {
            throw new IllegalArgumentException("Invalid file name")
        }

        String cleanName = fileName.endsWith(".json") ? fileName : fileName + ".json"
        Path resolvedPath = configFileDir.resolve(cleanName).normalize()

        if (!resolvedPath.startsWith(configFileDir)) {
            throw new SecurityException("Unauthorized path access detected")
        }
        return resolvedPath
    }

    @PostMapping('/saveConfig')
    def saveConfig(@RequestBody SaveConfigCommand cmd) {
        ObjectWriter ow = new ObjectMapper().writer().withDefaultPrettyPrinter()
        String json = ow.writeValueAsString(cmd.synthSettings)

        Path targetPath = resolveSafePath(cmd.fileName)
        Files.createDirectories(configFileDir)

        if (!cmd.overwrite && Files.exists(targetPath)) {
            throw new FileAlreadyExistsException("File name already in use")
        }

        Files.writeString(targetPath, json)

        return ResponseEntity.ok().body([
                message: targetPath.getFileName().toString() + " successfully " + (cmd.overwrite ? "updated" : "saved")
        ])
    }

    @PostMapping('/getConfigFileList')
    def getConfigFileList() {
        if (!Files.exists(configFileDir)) {
            return ResponseEntity.ok().body([])
        }

        def fileNames = Files.list(configFileDir)
                .filter(Files::isRegularFile)
                .map(p -> p.getFileName().toString())
                .filter(name -> name.endsWith(".json"))
                .map(name -> name.substring(0, name.lastIndexOf('.')))
                .collect(Collectors.toList())

        return ResponseEntity.ok().body(fileNames)
    }

    @PostMapping('/getSettings')
    def getSettings(@RequestBody GetSettingsCommand cmd) {
        Path targetPath = resolveSafePath(cmd.fileName)
        String configFile = Files.readString(targetPath)

        ObjectMapper mapper = new ObjectMapper()
        Map<String, Object> map = mapper.readValue(configFile, Map.class)
        return ResponseEntity.ok().body(map)
    }

    @PostMapping('/deleteConfig')
    def deleteConfig(@RequestBody DeleteConfigCommand cmd) {
        Path targetPath = resolveSafePath(cmd.fileName)

        if (Files.deleteIfExists(targetPath)) {
            return ResponseEntity.ok().body([message: "File " + cmd.fileName + " deleted"])
        } else {
            throw new NoSuchFileException("Could not find file " + cmd.fileName)
        }
    }

    @PostMapping('/renameConfigFile')
    def renameConfigFile(@RequestBody RenameConfigFileCommand cmd) {
        Path oldPath = resolveSafePath(cmd.oldName)
        Path newPath = resolveSafePath(cmd.newName)

        if (Files.exists(newPath)) {
            throw new FileAlreadyExistsException("File " + cmd.newName + " already exists")
        }

        Files.move(oldPath, newPath, StandardCopyOption.ATOMIC_MOVE)

        return ResponseEntity.ok().body([message: "Config file " + cmd.oldName + " renamed to " + cmd.newName])
    }
}

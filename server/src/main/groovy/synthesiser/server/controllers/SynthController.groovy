package synthesiser.server.controllers

import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import synthesiser.server.command.SaveConfigCommand
import tools.jackson.databind.ObjectMapper
import tools.jackson.databind.ObjectWriter

import java.nio.file.Files
import java.nio.file.Path

@RestController
@RequestMapping("/syn")
class SynthController {
    @PostMapping('/saveConfig')
    def saveConfig(@RequestBody SaveConfigCommand cmd) {
        try {
            ObjectWriter ow = new ObjectMapper().writer().withDefaultPrettyPrinter()
            String json = ow.writeValueAsString(cmd.synthSettings)
            def path = Path.of(System.getProperty("user.home"), "configs")
            Files.createDirectories(path)
            path = Path.of(path.toString(), cmd.fileName)
            File file = path.toFile()
            FileWriter fileWriter = new FileWriter(file)
            fileWriter.write(json)
            fileWriter.flush()
            fileWriter.close()
            return ResponseEntity.ok().body(cmd.fileName + " successfully saved")
        }
        catch (Exception ex) {
            return ResponseEntity
                    .internalServerError()
                    .body([exception: ex.getClass(), message: ex.getMessage()])
        }
    }
}

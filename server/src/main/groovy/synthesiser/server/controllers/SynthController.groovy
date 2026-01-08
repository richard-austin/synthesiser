package synthesiser.server.controllers

import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/synth")
class SynthController {
    @RequestMapping('/test')
    def testServer() {
        return "The test succeeded"
    }
}

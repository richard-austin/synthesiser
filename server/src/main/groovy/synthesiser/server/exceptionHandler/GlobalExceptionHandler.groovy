package synthesiser.server.exceptionHandler

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler
import java.nio.file.FileAlreadyExistsException
import java.nio.file.NoSuchFileException

@ControllerAdvice
class GlobalExceptionHandler {

    // Handles user input errors and security violations (Bad Request)
    @ExceptionHandler([
            IllegalArgumentException.class,
            SecurityException.class,
            FileAlreadyExistsException.class,
            NoSuchFileException.class
    ])
    ResponseEntity<Map> handleBadRequestExceptions(Exception ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body([
                exception: ex.getClass().getName(),
                message: ex.getMessage()
        ])
    }

    // Handles unexpected system or filesystem crashes (Internal Server Error)
    @ExceptionHandler(Exception.class)
    ResponseEntity<Map> handleGenericException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body([
                exception: ex.getClass().getName(),
                message: ex.getMessage()
        ])
    }
}

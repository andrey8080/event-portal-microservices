package back.user.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.logging.Logger;

@Configuration
public class DatabaseInitializer {
    private static final Logger logger = Logger.getLogger(DatabaseInitializer.class.getName());

    private final JdbcTemplate jdbcTemplate;

    public DatabaseInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void initialize() {
        try {
            createTables();
            migrateUserPhoneNumberNullability();
            createConstraintsAndTriggers();
            createIndexes();
            createFunctions();
        } catch (Exception e) {
            logger.severe("Error during database initialization: " + e.getMessage());
            throw e;
        }
    }

    private void createTables() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS \"User\" (
                    \"ID\" SERIAL PRIMARY KEY,
                    \"name\" VARCHAR(100) NOT NULL,
                    \"email\" VARCHAR(255) UNIQUE NOT NULL,
                    \"phoneNumber\" VARCHAR(50) UNIQUE,
                    \"password\" VARCHAR(255) NOT NULL,
                    \"role\" VARCHAR(50) CHECK (\"role\" IN ('organizer', 'participant', 'admin'))
                );
                """);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS \"Event\" (
                	\"ID\" SERIAL PRIMARY KEY,
                	\"title\" VARCHAR(200) NOT NULL,
                	\"description\" TEXT,
                	\"startDate\" TIMESTAMP NOT NULL,
                	\"endDate\" TIMESTAMP NOT NULL,
                	\"address\" VARCHAR(255),
                	\"latitude\" DOUBLE PRECISION,
                	\"longitude\" DOUBLE PRECISION,
                	\"organizerId\" INT NOT NULL,
                	\"organizerName\" VARCHAR(100),
                	\"price\" DOUBLE PRECISION,
                	\"maxParticipants\" INT,
                	\"registeredParticipants\" INT,
                	\"hasQuiz\" BOOLEAN,
                	\"images\" TEXT,
                	\"eventCategory\" VARCHAR(255),
                	\"status\" VARCHAR(50) DEFAULT 'active',
                	\"tags\" TEXT,
                	CONSTRAINT \"FK_Event_Organizer\"
                		FOREIGN KEY (\"organizerId\") REFERENCES \"User\" (\"ID\") ON DELETE CASCADE
                );
                """);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS \"Registration\" (
                    \"ID\" SERIAL PRIMARY KEY,
                    \"event\" INT NOT NULL,
                    \"member\" INT NOT NULL,
                    \"date\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT \"FK_Registration_Event\"
                        FOREIGN KEY (\"event\") REFERENCES \"Event\" (\"ID\") ON DELETE CASCADE,
                    CONSTRAINT \"FK_Registration_User\"
                        FOREIGN KEY (\"member\") REFERENCES \"User\" (\"ID\") ON DELETE CASCADE
                );
                """);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS \"Quiz\" (
                    \"ID\" SERIAL PRIMARY KEY,
                    \"event\" INT NOT NULL,
                    \"description\" TEXT,
                    \"time_to_pass\" INT CHECK (\"time_to_pass\" > 0),
                    CONSTRAINT \"FK_Quiz_Event\"
                        FOREIGN KEY (\"event\") REFERENCES \"Event\" (\"ID\") ON DELETE CASCADE
                );
                """);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS \"QuizQuestion\" (
                    \"ID\" SERIAL PRIMARY KEY,
                    \"quiz\" INT NOT NULL,
                    \"text\" TEXT NOT NULL,
                    \"type\" VARCHAR(50) CHECK (\"type\" IN ('text', 'multiple_choice', 'single_choice')),
                    CONSTRAINT \"FK_QuizQuestion_Quiz\"
                        FOREIGN KEY (\"quiz\") REFERENCES \"Quiz\" (\"ID\") ON DELETE CASCADE
                );
                """);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS \"QuizAnswer\" (
                    \"ID\" SERIAL PRIMARY KEY,
                    \"quiz_question\" INT NOT NULL,
                    \"text\" TEXT NOT NULL,
                    CONSTRAINT \"FK_QuizAnswer_QuizQuestion\"
                        FOREIGN KEY (\"quiz_question\") REFERENCES \"QuizQuestion\" (\"ID\") ON DELETE CASCADE
                );
                """);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS \"UserQuizResult\" (
                    \"ID\" SERIAL PRIMARY KEY,
                    \"user\" INT NOT NULL,
                    \"quiz\" INT NOT NULL,
                    \"date_end\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    \"result\" FLOAT CHECK (\"result\" >= 0 AND \"result\" <= 100),
                    CONSTRAINT \"FK_UserQuizResult_User\"
                        FOREIGN KEY (\"user\") REFERENCES \"User\" (\"ID\") ON DELETE CASCADE,
                    CONSTRAINT \"FK_UserQuizResult_Quiz\"
                        FOREIGN KEY (\"quiz\") REFERENCES \"Quiz\" (\"ID\") ON DELETE CASCADE
                );
                """);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS \"Feedback\" (
                    \"ID\" SERIAL PRIMARY KEY,
                    \"user\" INT NOT NULL,
                    \"event\" INT NOT NULL,
                    \"rating\" INT CHECK (\"rating\" BETWEEN 1 AND 5),
                    \"comment\" TEXT,
                    CONSTRAINT \"FK_Feedback_User\"
                        FOREIGN KEY (\"user\") REFERENCES \"User\" (\"ID\") ON DELETE CASCADE,
                    CONSTRAINT \"FK_Feedback_Event\"
                        FOREIGN KEY (\"event\") REFERENCES \"Event\" (\"ID\") ON DELETE CASCADE
                );
                """);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS \"OrganizerStats\" (
                    \"ID\" SERIAL PRIMARY KEY,
                    \"event\" INT NOT NULL UNIQUE,
                    \"quantity_of_participants\" INT DEFAULT 0 CHECK (\"quantity_of_participants\" >= 0),
                    \"medium_rating\" FLOAT DEFAULT 0 CHECK (\"medium_rating\" >= 0 AND \"medium_rating\" <= 5),
                    CONSTRAINT \"FK_OrganizerStats_Event\"
                        FOREIGN KEY (\"event\") REFERENCES \"Event\" (\"ID\") ON DELETE CASCADE
                );
                """);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS \"BlackListUsers\" (
                    \"ID\" SERIAL PRIMARY KEY,
                    \"user\" INT NOT NULL UNIQUE,
                    \"reason\" TEXT NOT NULL,
                    CONSTRAINT \"FK_BlackListUsers_User\"
                        FOREIGN KEY (\"user\") REFERENCES \"User\" (\"ID\") ON DELETE CASCADE
                );
                """);
    }

    private void migrateUserPhoneNumberNullability() {
        try {
            jdbcTemplate.execute("""
                    ALTER TABLE \"User\"
                    ALTER COLUMN \"phoneNumber\" DROP NOT NULL;
                    """);
        } catch (Exception e) {
            logger.warning(
                    "Could not drop NOT NULL from User.phoneNumber (may already be nullable): " + e.getMessage());
        }

        try {
            jdbcTemplate.execute("""
                    UPDATE \"User\"
                    SET \"phoneNumber\" = NULL
                    WHERE \"phoneNumber\" = '';
                    """);
        } catch (Exception e) {
            logger.warning("Could not normalize empty phoneNumber to NULL: " + e.getMessage());
        }
    }

    private void createConstraintsAndTriggers() {
        jdbcTemplate.execute("""
                DROP TRIGGER IF EXISTS increment_participants ON \"Registration\";
                """);

        jdbcTemplate.execute("""
                CREATE OR REPLACE FUNCTION update_participants_count()
                RETURNS TRIGGER AS $$
                BEGIN
                    UPDATE \"Event\"
                    SET \"registeredParticipants\" = \"registeredParticipants\" + 1
                    WHERE \"ID\" = NEW.\"event\";

                    UPDATE \"OrganizerStats\"
                    SET \"quantity_of_participants\" = \"quantity_of_participants\" + 1
                    WHERE \"event\" = NEW.\"event\";

                    IF NOT FOUND THEN
                        INSERT INTO \"OrganizerStats\" (\"event\", \"quantity_of_participants\", \"medium_rating\")
                        VALUES (NEW.\"event\", 1, 0)
                        ON CONFLICT (\"event\") DO NOTHING;
                    END IF;

                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
                """);

        jdbcTemplate.execute("""
                CREATE TRIGGER increment_participants
                AFTER INSERT ON \"Registration\"
                FOR EACH ROW
                EXECUTE FUNCTION update_participants_count();
                """);

        jdbcTemplate.execute("""
                DROP TRIGGER IF EXISTS recalculate_rating ON \"Feedback\";
                """);

        jdbcTemplate.execute("""
                CREATE OR REPLACE FUNCTION update_medium_rating()
                RETURNS TRIGGER AS $$
                BEGIN
                    UPDATE \"OrganizerStats\"
                    SET \"medium_rating\" = (
                        SELECT AVG(\"rating\")::FLOAT
                        FROM \"Feedback\"
                        WHERE \"event\" = NEW.\"event\"
                    )
                    WHERE \"event\" = NEW.\"event\";
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
                """);

        jdbcTemplate.execute("""
                CREATE TRIGGER recalculate_rating
                AFTER INSERT OR UPDATE ON \"Feedback\"
                FOR EACH ROW
                EXECUTE FUNCTION update_medium_rating();
                """);
    }

    private void createIndexes() {
        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_user_quiz_result ON \"UserQuizResult\" (\"user\", \"quiz\");
                """);
    }

    private void createFunctions() {
        jdbcTemplate.execute("""
                CREATE OR REPLACE FUNCTION save_quiz_result(user_id INT, quiz_id INT, result_value FLOAT)
                RETURNS TEXT AS $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM \"UserQuizResult\" WHERE \"user\" = user_id AND \"quiz\" = quiz_id) THEN
                        UPDATE \"UserQuizResult\"
                        SET \"result\" = result_value, \"date_end\" = CURRENT_TIMESTAMP
                        WHERE \"user\" = user_id AND \"quiz\" = quiz_id;
                        RETURN 'Quiz result updated successfully.';
                    ELSE
                        INSERT INTO \"UserQuizResult\" (\"user\", \"quiz\", \"result\")
                        VALUES (user_id, quiz_id, result_value);
                        RETURN 'Quiz result saved successfully.';
                    END IF;
                END;
                $$ LANGUAGE plpgsql;
                """);
    }
}

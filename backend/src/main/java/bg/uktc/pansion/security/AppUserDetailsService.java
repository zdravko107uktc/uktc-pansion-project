package bg.uktc.pansion.security;

import bg.uktc.pansion.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Loads users for Spring Security, both by email (standard contract) and by id (JWT subject). */
@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public AppUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .map(AppUserPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    @Transactional(readOnly = true)
    public AppUserPrincipal loadById(Long userId) {
        return userRepository.findById(userId)
                .map(AppUserPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));
    }
}

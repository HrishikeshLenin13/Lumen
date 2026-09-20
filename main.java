import java.util.Scanner;

class Main {
  public static void main(String[] args) {
    Scanner scan = new Scanner(System.in);
    System.out.println("Calculator — <a> <op> <b>  (+ - * /)  or q");
    while (true) {
      System.out.print("> ");
      String line = scan.nextLine().trim();
      if (line.isEmpty()) continue;
      if (line.equalsIgnoreCase("q")) {
        System.out.println("Goodbye.");
        break;
      }
      String[] parts = line.split("\\s+");
      if (parts.length != 3) {
        System.out.println("Use: number operator number");
        continue;
      }
      try {
        double a = Double.parseDouble(parts[0]);
        double b = Double.parseDouble(parts[2]);
        String op = parts[1];
        double r = switch (op) {
          case "+" -> a + b;
          case "-" -> a - b;
          case "*" -> a * b;
          case "/" -> {
            if (b == 0) throw new ArithmeticException("divide by zero");
            yield a / b;
          }
          default -> throw new IllegalArgumentException("bad op: " + op);
        };
        System.out.println("= " + r);
      } catch (NumberFormatException e) {
        System.out.println("Invalid number.");
      } catch (ArithmeticException | IllegalArgumentException e) {
        System.out.println("Error: " + e.getMessage());
      }
    }
    scan.close();
  }
}

class PrimeHelper {
  static boolean isPrime(long n) {
    if (n < 2) return false;
    if (n == 2) return true;
    if (n % 2 == 0) return false;
